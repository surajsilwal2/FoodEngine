import { Injectable, Logger } from '@nestjs/common';
import {
  PrismaService,
  DeliveryStatus,
  OrderStatus,
} from '@foodengine/database';
import { DispatchGateway } from './dispatch.gateway.js';


@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchGateway: DispatchGateway,
  ) {}

  // A lost queue job should alert the restaurant, never cancel/refund food
  // already being prepared. This is a recovery path for dispatch only.
  async flagStaleDispatches() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const staleDeliveries = await this.prisma.delivery.findMany({
      where: {
        status: DeliveryStatus.SEARCHING,
        createdAt: { lte: fifteenMinutesAgo },
        order: {
          is: {
            status: {
              in: [OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP],
            },
          },
        },
      },
      include: {
        order: {
          select: { id: true, restaurantId: true },
        },
      },
    });

    if (staleDeliveries.length === 0) return;

    this.logger.warn(
      `Found ${staleDeliveries.length} stale dispatches. Alerting restaurants...`,
    );

    for (const delivery of staleDeliveries) {
      try {
        const update = await this.prisma.delivery.updateMany({
          where: {
            id: delivery.id,
            status: DeliveryStatus.SEARCHING,
            driverProfileId: null,
          },
          data: { status: DeliveryStatus.FAILED },
        });
        if (update.count !== 1) continue;

        const message =
          'Driver search is delayed. The order is still being prepared; retry dispatch or arrange another pickup.';
        this.dispatchGateway.notifyRestaurantOrderChanged(
          delivery.order.restaurantId,
          {
            type: 'dispatch_attention',
            orderId: delivery.orderId,
            deliveryStatus: DeliveryStatus.FAILED,
            message,
          },
        );
        this.dispatchGateway.notifyOrderStatus(delivery.orderId, {
          deliveryStatus: DeliveryStatus.FAILED,
          dispatchAttention: true,
        });

        this.logger.log(
          `Flagged stale Delivery #${delivery.id} for merchant recovery`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to flag stale Delivery #${delivery.id}`,
          error,
        );
      }
    }
  }
}
