import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateDeliveryDto } from './dto/update-delivery.dto.js';
import {
  DeliveryStatus,
  OrderStatus,
  PrismaService,
  UserRole,
} from '@foodengine/database';
import { DispatchGateway } from '../dispatch/dispatch.gateway.js';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchGateway: DispatchGateway,
  ) {}
  async acceptDelivery(userId: number, userRole: UserRole, deliveryId: number) {
    this.ensureDriverRole(userRole);
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!driverProfile || !driverProfile.isApproved) {
      throw new ForbiddenException(
        'Only approved drivers can accept deliveries',
      );
    }
    if (!driverProfile.isOnline)
      throw new BadRequestException('You must be online to accept deliveries');

    // A driver can work on only one delivery at a time.
    const activeDelivery = await this.prisma.delivery.findFirst({
      where: {
        driverProfileId: driverProfile.id,
        status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP] },
      },
    });
    if (activeDelivery)
      throw new BadRequestException(
        'You are already assigned to an active delivery',
      );

    const result = await this.prisma.delivery.updateMany({
      where: {
        id: deliveryId,
        status: DeliveryStatus.SEARCHING,
        driverProfileId: null,
      },
      data: {
        driverProfileId: driverProfile.id,
        status: DeliveryStatus.ASSIGNED,
      },
    });
    if (result.count !== 1)
      throw new BadRequestException(
        'Delivery is no longer available or was accepted by another driver',
      );

    // Load delivery details for the customer notification.
    const updatedDelivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: { select: { id: true, customerId: true, restaurantId: true } },
        driver: {
          select: {
            id: true,
            vehicleDetails: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!updatedDelivery) {
      throw new NotFoundException(`Delivery #${deliveryId} not found`);
    }

    // Tell the customer that a driver accepted the delivery.
    this.dispatchGateway.notifyOrderStatus(updatedDelivery.orderId, {
      status: 'DRIVER_ASSIGNED',
      driverName: updatedDelivery.driver?.user.name,
      vehicleDetails: updatedDelivery.driver?.vehicleDetails,
    });
    this.dispatchGateway.notifyRestaurantOrderChanged(
      updatedDelivery.order.restaurantId,
      {
        orderId: updatedDelivery.orderId,
        deliveryStatus: DeliveryStatus.ASSIGNED,
      },
    );

    return updatedDelivery;
  }

  // Move a delivery through its allowed statuses.
  async updateDeliveryStatus(
    userId: number,
    userRole: UserRole,
    deliveryId: number,
    dto: UpdateDeliveryDto,
  ) {
    this.ensureDriverRole(userRole);
    const { status: newStatus } = dto;
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!driverProfile) {
      throw new ForbiddenException('Driver profile required');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery #${deliveryId} not found`);
    }

    if (delivery.driverProfileId !== driverProfile.id) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    // Only these status changes are allowed.
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.SEARCHING]: [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.CANCELLED,
      ],
      [DeliveryStatus.ASSIGNED]: [
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
      ],
      [DeliveryStatus.PICKED_UP]: [
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
      ],
      [DeliveryStatus.DELIVERED]: [],
      [DeliveryStatus.FAILED]: [],
      [DeliveryStatus.CANCELLED]: [],
    };

    if (!validTransitions[delivery.status].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${delivery.status} to ${newStatus}`,
      );
    }

    // The order status the driver's action implies, and the order states it may
    // legitimately advance from. A driver is never blocked by the merchant
    // forgetting to press "Mark ready for pickup": collecting the food is valid
    // while the order is still PREPARING, and completing it is valid from either
    // PICKED_UP or READY_FOR_PICKUP.
    const nextOrderStatus = this.getOrderStatusForDeliveryStatus(newStatus);
    const allowedPreviousOrderStatuses =
      this.getAllowedPreviousOrderStatuses(newStatus);

    const updatedDelivery = await this.prisma.$transaction(async (tx) => {
      // Check the old status again inside the write to prevent concurrent
      // requests from applying two status changes at once.
      const result = await tx.delivery.updateMany({
        where: {
          id: deliveryId,
          driverProfileId: driverProfile.id,
          status: delivery.status,
        },
        data: { status: newStatus },
      });
      if (result.count !== 1) {
        throw new BadRequestException('Delivery status has already changed');
      }

      if (nextOrderStatus) {
        // Keep the customer-facing order status in sync with the driver flow.
        const orderUpdate = await tx.order.updateMany({
          where: {
            id: delivery.orderId,
            status: { in: allowedPreviousOrderStatuses },
          },
          data: { status: nextOrderStatus },
        });
        if (orderUpdate.count !== 1) {
          throw new BadRequestException(
            'This order can no longer be updated from the driver app',
          );
        }
      }

      return tx.delivery.findUniqueOrThrow({
        where: { id: deliveryId },
      });
    });

    const resultingOrderStatus = nextOrderStatus ?? delivery.order.status;

    // Send the events after the database update has been committed.
    this.dispatchGateway.notifyOrderStatus(delivery.orderId, {
      status: resultingOrderStatus,
      deliveryStatus: newStatus,
      updatedAt: updatedDelivery.updatedAt,
    });
    // The merchant desk must learn about pickup and delivery immediately instead
    // of waiting for its polling interval to become fresh.
    this.dispatchGateway.notifyRestaurantOrderChanged(
      delivery.order.restaurantId,
      {
        type: 'delivery_status_changed',
        orderId: delivery.orderId,
        status: resultingOrderStatus,
        deliveryStatus: newStatus,
      },
    );

    return updatedDelivery;
  }

  // Get the driver's current assigned or picked-up delivery.
  async getActiveDriverDelivery(userId: number, userRole: UserRole) {
    this.ensureDriverRole(userRole);
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    return this.prisma.delivery.findFirst({
      where: {
        driverProfileId: driverProfile.id,
        status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP] },
      },
      include: {
        order: {
          include: {
            items: true,
            restaurant: {
              select: {
                name: true,
                location: true,
                restaurantLat: true,
                restaurantLng: true,
              },
            },
            customer: { select: { name: true } },
          },
        },
      },
    });
  }

  // Driver delivery routes use the account role, not tenant membership.
  private ensureDriverRole(userRole: UserRole) {
    if (userRole !== UserRole.DRIVER) {
      throw new ForbiddenException('Only drivers can access deliveries');
    }
  }

  private getOrderStatusForDeliveryStatus(status: DeliveryStatus) {
    if (status === DeliveryStatus.PICKED_UP) return OrderStatus.PICKED_UP;
    if (status === DeliveryStatus.DELIVERED) return OrderStatus.DELIVERED;
    return null;
  }

  // Order states a delivery status change may advance from. Being permissive
  // keeps the driver's progress independent of the merchant's own
  // "ready for pickup" step, which is advisory rather than a hard gate.
  private getAllowedPreviousOrderStatuses(status: DeliveryStatus) {
    if (status === DeliveryStatus.PICKED_UP) {
      return [OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP];
    }
    if (status === DeliveryStatus.DELIVERED) {
      return [OrderStatus.PICKED_UP, OrderStatus.READY_FOR_PICKUP];
    }
    return [];
  }
}
