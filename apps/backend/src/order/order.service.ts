import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import {
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaService,
  UserRole,
} from '@foodengine/database';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { DispatchGateway } from '../dispatch/dispatch.gateway.js';
import { DispatchService } from '../dispatch/dispatch.service.js';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchGateway: DispatchGateway,
    private readonly dispatchService: DispatchService,
  ) {}

  async createOrder(customerId: number, dto: CreateOrderDto) {
    // An order without line items cannot be priced or fulfilled.
    if (!dto.items || dto.items.length === 0)
      throw new BadRequestException('An order must contain at least one item');

    return this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findFirst({
        where: {
          id: dto.restaurantId,
          tenantId: dto.tenantId,
          deletedAt: null,
        },
        select: { id: true, isOpen: true },
      });

      if (!restaurant) {
        throw new NotFoundException('Restaurant is unavailable');
      }
      if (!restaurant.isOpen) {
        throw new BadRequestException(
          'This restaurant is currently closed and cannot accept orders',
        );
      }

      // Fetch items from the requested restaurant and tenant. Prices and names
      // are read from the database rather than accepted from the client.
      const menuItemIds = dto.items.map((i) => i.menuItemId);
      const dbMenuItems = await tx.menuItem.findMany({
        where: {
          id: { in: menuItemIds },
          restaurantId: dto.restaurantId,
          tenantId: dto.tenantId,
          deletedAt: null,
        },
      });

      if (dbMenuItems.length !== menuItemIds.length)
        throw new BadRequestException(
          'One or more items are invalid or unavailable for this restaurant',
        );

      // Store snapshots so later menu edits do not change historical orders.
      let calculateTotal = new Prisma.Decimal(0);
      const orderItemSnapshots = [];

      for (const itemDto of dto.items) {
        if (itemDto.quantity <= 0)
          throw new BadRequestException('Item quantity must be greater than 0');

        const menuItem = dbMenuItems.find((m) => m.id === itemDto.menuItemId);
        if (!menuItem?.isAvailable)
          throw new BadRequestException(
            `Item "${menuItem?.name}" is currently out stock`,
          );

        const lineTotal = menuItem.price.mul(itemDto.quantity);
        calculateTotal = calculateTotal.add(lineTotal);
        orderItemSnapshots.push({
          menuItemId: menuItem.id,
          snapshotName: menuItem.name,
          unitPrice: menuItem.price,
          quantity: itemDto.quantity,
        });
      }
      // Persist the order and its item snapshots in the same transaction.
      const order = await tx.order.create({
        data: {
          restaurantId: dto.restaurantId,
          tenantId: dto.tenantId,
          customerId,
          deliveryAddress: dto.deliveryAddress,
          deliveryLat: dto.deliveryLat,
          deliveryLng: dto.deliveryLng,
          total: calculateTotal,
          status: OrderStatus.PENDING,
          items: {
            create: orderItemSnapshots,
          },
        },
        include: {
          items: true,
          restaurant: { select: { name: true } },
        },
      });
      return order;
    });
  }

  async getOrderById(
    orderId: number,
    userId: number,
    userGolbalRole: UserRole,
  ) {
    // Load all display data first, then apply ownership or tenant membership.
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        restaurant: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        delivery: {
          select: {
            status: true,
            driver: {
              select: {
                currentLat: true,
                currentLong: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    if (!order || order.deletedAt) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    if (userGolbalRole === UserRole.SYSTEM_ADMIN || order.customerId === userId) {
      // Customer GPS is private until the driver has picked up the order.
      if (order.delivery && order.delivery.status !== DeliveryStatus.PICKED_UP) {
        order.delivery.driver = null;
      }
      return order;
    }

    const member = await this.prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: order.tenantId,
        },
      },
    });
    if (!member) {
      throw new ForbiddenException('Access denied to this order');
    }
    return order;
  }

  async getCustomerOrders(customerId: number) {
    // Customers see only their own non-deleted order history.
    return this.prisma.order.findMany({
      where: { customerId, deletedAt: null },
      include: {
        items: true,
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRestaurantOrders(restaurantId: number) {
    // Only completed payments are actionable. Unpaid PENDING orders stay out
    // of the restaurant inbox until checkout succeeds.
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        payment: { is: { status: PaymentStatus.COMPLETED } },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
        delivery: {
          select: {
            id: true,
            status: true,
            // The kitchen desk needs to know who is collecting the order so the
            // handoff column can name the courier instead of showing a bare status.
            driver: {
              select: {
                vehicleDetails: true,
                user: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(orderId: number, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, deletedAt: null },
      include: {
        payment: true,
        delivery: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            restaurantLat: true,
            restaurantLng: true,
          },
        },
      },
    });
    if (!order || order.deletedAt) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    // This map makes the allowed order lifecycle explicit and rejects skipped
    // or reversed states (for example, PENDING directly to READY_FOR_PICKUP).
    const validTransition: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.CANCELLED],
      [OrderStatus.PICKED_UP]: [],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransition[order.status].includes(dto.newStatus)) {
      throw new BadRequestException(
        `Invalid state transition from ${order.status} to ${dto.newStatus}`,
      );
    }

    if (dto.newStatus === OrderStatus.PREPARING) {
      if (order.payment?.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException('Only paid orders can be prepared');
      }
      if (
        order.restaurant.restaurantLat == null ||
        order.restaurant.restaurantLng == null
      ) {
        throw new BadRequestException(
          'Set this restaurant latitude and longitude before starting preparation',
        );
      }
      if (order.delivery?.status !== DeliveryStatus.SEARCHING) {
        throw new BadRequestException(
          'This order does not have a delivery ready for driver search',
        );
      }
    }

    if (
      dto.newStatus === OrderStatus.CANCELLED &&
      order.delivery &&
      (order.delivery.status === DeliveryStatus.ASSIGNED ||
        order.delivery.status === DeliveryStatus.PICKED_UP)
    ) {
      throw new BadRequestException(
        'This order cannot be cancelled after a driver has accepted it',
      );
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const orderUpdate = await tx.order.updateMany({
        where: { id: orderId, status: order.status, deletedAt: null },
        data: { status: dto.newStatus },
      });
      if (orderUpdate.count !== 1) {
        throw new BadRequestException('The order status has already changed');
      }

      if (
        dto.newStatus === OrderStatus.CANCELLED &&
        order.payment?.status === PaymentStatus.COMPLETED
      ) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.REFUNDED },
        });
      }
      if (
        dto.newStatus === OrderStatus.CANCELLED &&
        order.delivery &&
        (order.delivery.status === DeliveryStatus.SEARCHING ||
          order.delivery.status === DeliveryStatus.FAILED)
      ) {
        const deliveryUpdate = await tx.delivery.updateMany({
          where: {
            id: order.delivery.id,
            status: order.delivery.status,
            driverProfileId: null,
          },
          data: { status: DeliveryStatus.CANCELLED },
        });
        if (deliveryUpdate.count !== 1) {
          throw new BadRequestException(
            'A driver accepted this delivery while cancellation was in progress',
          );
        }
      }
      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          restaurant: { select: { id: true } },
        },
      });
    });

    this.dispatchGateway.notifyOrderStatus(orderId, {
      status: updatedOrder.status,
    });
    this.dispatchGateway.notifyRestaurantOrderChanged(
      updatedOrder.restaurantId,
      { orderId, status: updatedOrder.status },
    );

    if (dto.newStatus === OrderStatus.PREPARING && order.delivery) {
      const jobData = {
        orderId,
        deliveryId: order.delivery.id,
        restaurantId: updatedOrder.restaurantId,
        restaurantLat: order.restaurant.restaurantLat!,
        restaurantLng: order.restaurant.restaurantLng!,
        restaurantName: order.restaurant.name,
        cycleId: updatedOrder.updatedAt.getTime(),
        attemptNumber: 1,
        offeredDriverProfileIds: [],
      };

      try {
        await this.dispatchService.enqueueSearch(jobData);
      } catch {
        await this.prisma.delivery.updateMany({
          where: {
            id: order.delivery.id,
            status: DeliveryStatus.SEARCHING,
          },
          data: { status: DeliveryStatus.FAILED },
        });
        this.dispatchGateway.notifyRestaurantOrderChanged(
          updatedOrder.restaurantId,
          {
            type: 'dispatch_attention',
            orderId,
            deliveryStatus: DeliveryStatus.FAILED,
            message: 'Driver search could not be started. Retry dispatch.',
          },
        );
      }
    }

    return updatedOrder;
  }

  async retryDispatch(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, deletedAt: null },
      include: {
        delivery: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            restaurantLat: true,
            restaurantLng: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);
    if (
      (order.status !== OrderStatus.PREPARING &&
        order.status !== OrderStatus.READY_FOR_PICKUP) ||
      !order.delivery
    ) {
      throw new BadRequestException(
        'Driver search can only be retried for an active restaurant order',
      );
    }
    if (order.delivery.status !== DeliveryStatus.FAILED) {
      throw new BadRequestException(
        'Driver search does not currently need a manual retry',
      );
    }
    if (
      order.restaurant.restaurantLat == null ||
      order.restaurant.restaurantLng == null
    ) {
      throw new BadRequestException(
        'Set this restaurant latitude and longitude before retrying dispatch',
      );
    }

    const restarted = await this.prisma.delivery.updateMany({
      where: {
        id: order.delivery.id,
        status: DeliveryStatus.FAILED,
        driverProfileId: null,
      },
      data: { status: DeliveryStatus.SEARCHING },
    });
    if (restarted.count !== 1) {
      throw new BadRequestException('Driver search has already been restarted');
    }

    try {
      await this.dispatchService.enqueueSearch({
        orderId,
        deliveryId: order.delivery.id,
        restaurantId: order.restaurantId,
        restaurantLat: order.restaurant.restaurantLat,
        restaurantLng: order.restaurant.restaurantLng,
        restaurantName: order.restaurant.name,
        cycleId: Date.now(),
        attemptNumber: 1,
        offeredDriverProfileIds: [],
      });
    } catch {
      await this.prisma.delivery.updateMany({
        where: { id: order.delivery.id, status: DeliveryStatus.SEARCHING },
        data: { status: DeliveryStatus.FAILED },
      });
      throw new ServiceUnavailableException(
        'Driver search could not be queued. Please retry in a moment.',
      );
    }

    this.dispatchGateway.notifyRestaurantOrderChanged(order.restaurantId, {
      type: 'dispatch_restarted',
      orderId,
      deliveryStatus: DeliveryStatus.SEARCHING,
    });
    return { orderId, deliveryStatus: DeliveryStatus.SEARCHING };
  }
}