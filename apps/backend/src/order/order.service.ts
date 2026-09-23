import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import {
  OrderStatus,
  Prisma,
  PrismaService,
  UserRole,
} from '@foodengine/database';
import { UpdateOrderDto } from './dto/update-order.dto.js';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(customerId: number, dto: CreateOrderDto) {
    // An order without line items cannot be priced or fulfilled.
    if (!dto.items || dto.items.length === 0)
      throw new BadRequestException('An order must contain at least one item');

    return this.prisma.$transaction(async (tx) => {
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
        customer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order || order.deletedAt) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    if (userGolbalRole === UserRole.SYSTEM_ADMIN || order.customerId === userId)
      return order;

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
    // Authorization is performed by the controller guards using restaurantId.
    return this.prisma.order.findMany({
      where: { restaurantId, deletedAt: null },
      include: { items: true, customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(orderId: number, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, deletedAt: null },
      include: { payment: true },
    });
    if (!order || order.deletedAt) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    // This map makes the allowed order lifecycle explicit and rejects skipped
    // or reversed states (for example, PENDING directly to READY_FOR_PICKUP).
    const validTransition: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransition[order.status].includes(dto.newStatus)) {
      throw new BadRequestException(
        `Invalid state transition from ${order.status} to ${dto.newStatus}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // order is cancelled but payment has done then update the payment status to refunded
      if (
        dto.newStatus === OrderStatus.CANCELLED &&
        order.payment &&
        order.payment.status === 'COMPLETED'
      ) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: 'REFUNDED' },
        });
      }
      return this.prisma.order.update({
        where: { id: orderId },
        data: { status: dto.newStatus },
      });
    });
  }
}
