import {
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaService,
  UserRole,
} from '@foodengine/database';
import crypto from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProcessPaymentDto } from './dto/process-payment.dto.js';
import { DispatchGateway } from '../dispatch/dispatch.gateway.js';
import { DriverService } from '../driver/driver.service.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchGateway: DispatchGateway,
    private readonly driverService: DriverService,
    @InjectQueue('dispatch-queue') private readonly dispatchQueue: Queue,
  ) {}

  async createPayment(customerId: number, dto: ProcessPaymentDto) {
    // Load the order and its one-to-one payment record before attempting a charge. The amount always comes from the stored order total.
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });
    if (!order || order.deletedAt) {
      throw new NotFoundException(`Order #${dto.orderId} not found`);
    }

    // Only the customer who placed the order can initiate its payment.
    if (order.customerId !== customerId) {
      throw new ForbiddenException(
        'You are not authorized to pay for this order',
      );
    }

    // A payment is accepted only once, while the order is awaiting payment.
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order is already in ${order.status} state and cannot be paid for again`,
      );
    }

    if (order.payment && order.payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Payment for this order has already been completed',
      );
    }

    // This is a mock provider: generate a provider-like transaction reference.
    // A real provider would supply this value after a verified callback.
    const mockTxnId = `MOCK_TXN_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const selectedMethod = dto.paymentMethod || PaymentMethod.MOCK_CARD;

    const result = await this.prisma.$transaction(async (tx) => {
      // This conditional update is the payment-state lock. Concurrent callers
      // cannot both advance the same order from PENDING to CONFIRMED.
      const orderUpdate = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.PENDING, deletedAt: null },
        data: { status: OrderStatus.CONFIRMED },
      });
      if (orderUpdate.count !== 1) {
        throw new BadRequestException('Order is no longer awaiting payment');
      }

      // Keep payment, order confirmation, and delivery creation atomic. If any write fails, the transaction rolls back all three changes.
      const payment = await tx.payment.upsert({
        where: {
          orderId: order.id,
        },
        create: {
          orderId: order.id,
          tenantId: order.tenantId,
          amount: order.total,
          status: PaymentStatus.COMPLETED,
          provider: selectedMethod,
          transactionId: mockTxnId,
        },
        update: {
          status: PaymentStatus.COMPLETED,
          provider: selectedMethod,
          transactionId: mockTxnId,
        },
      });
      // A successful mock payment makes the restaurant-facing order actionable.
      // Delivery starts unassigned; dispatch can look for SEARCHING deliveries.
      const delivery = await tx.delivery.create({
        data: {
          orderId: order.id,
          status: DeliveryStatus.SEARCHING,
        },
      });
      return {
        success: true,
        message: 'Payment is successful and order is confirmed',
        payment,
        orderStatus: OrderStatus.CONFIRMED,
        delivery,
      };
    });

    this.dispatchGateway.notifyOrderStatus(order.id, {
      status: OrderStatus.CONFIRMED,
    });

    // Dispatch is outside the transaction: database state must remain committed even when Redis or a socket server is temporarily down.
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: order?.restaurantId },
    });

    if (restaurant?.restaurantLat == null || restaurant.restaurantLng == null) {
      // The delivery remains SEARCHING for a retry/manual assignment;
      this.logger.warn(
        `Delivery #${result.delivery.id} was not dispatched: restaurant coordinates are missing`,
      );
      return result;
    }

    // enqueue background dispatch retry job
    // bullmq will attempt the job up to 5 times, waiting for 15sec for each retries
    await this.dispatchQueue.add(
      'find-driver',
      {
        deliveryId: result.delivery.id,
        restaurantLat: restaurant.restaurantLat,
        restaurantLng: restaurant.restaurantLng,
      },
      {
        attempts: 5,
        backoff: {
          type: 'fixed',
          delay: 15000, // wait 15 seconds before retry
        },
        removeOnComplete: true, // auto-clean finished job from redis
      },
    );

    this.logger.log(
      `Enqueued background dispatch job for Delivery #${result.delivery.id}`,
    );

    return result;
  }

  async getPaymentByOrder(orderId: number, userId: number, userRole: UserRole) {
    // Include only the fields needed to decide whether the caller may view it.
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        orders: {
          select: { id: true, customerId: true, tenantId: true, total: true },
        },
      },
    });
    if (!payment) {
      throw new NotFoundException(
        `No payment record found for Order #${orderId}`,
      );
    }

    // The order owner and system admin can always view payment details.
    if (
      userRole === UserRole.SYSTEM_ADMIN ||
      payment.orders.customerId === userId
    ) {
      return payment;
    }

    // Otherwise, allow a member of the restaurant's tenant (merchant access).
    const member = await this.prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: payment.tenantId,
        },
      },
    });
    if (!member) {
      throw new ForbiddenException('Access denied to payment details');
    }

    return payment;
  }
}
