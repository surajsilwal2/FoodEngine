import { Injectable, Logger } from '@nestjs/common';
import {
  PrismaService,
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
} from '@foodengine/database';
import { DispatchGateway } from './dispatch.gateway.js';


// "Find any delivery created more than 15 minutes ago that is STILL in SEARCHING status with a COMPLETED payment, cancel the order, and issue an automatic refund."
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchGateway: DispatchGateway,
  ) {}

  // remove for stale orders stuck in SEARCHING for more than 15 minutes
  async autoRefundStaleDeliveries() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const staleDeliveries = await this.prisma.delivery.findMany({
      where: {
        status: DeliveryStatus.SEARCHING,
        createdAt: { lte: fifteenMinutesAgo },
      },
      include: {
        order: {
          include: { payment: true },
        },
      },
    });

    if (staleDeliveries.length === 0) return;

    this.logger.warn(
      `Found ${staleDeliveries.length} stale deliveries. Processing refunds...`,
    );

    for (const delivery of staleDeliveries) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.delivery.update({
            where: { id: delivery.id },
            data: { status: DeliveryStatus.FAILED },
          });

          await tx.order.update({
            where: { id: delivery.orderId },
            data: { status: OrderStatus.CANCELLED },
          });

          if (delivery.order.payment) {
            await tx.payment.update({
              where: { id: delivery.order.payment.id },
              data: { status: PaymentStatus.REFUNDED },
            });
          }
        });

        this.dispatchGateway.notifyOrderStatus(delivery.orderId, {
          status: 'ORDER_CANCELLED',
          message:
            'Order timed out searching for a driver. Automated refund processed.',
        });

        this.logger.log(
          `Auto-refunded stale Delivery #${delivery.id} and Order #${delivery.orderId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to auto-refund Delivery #${delivery.id}`,
          error,
        );
      }
    }
  }
}
