import {
  DeliveryStatus,
  OrderStatus,
  PrismaService,
} from '@foodengine/database';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DriverService } from '../driver/driver.service.js';
import { DispatchGateway } from './dispatch.gateway.js';
import { Job } from 'bullmq';

export interface DispatchJobData {
  deliveryId: number;
  restaurantLat: number;
  restaurantLng: number;
  radiusKm?: number;
  attemptNumber?: number;
}

// Processor registers this class as a bullmq worker processing jobs from 'dispatch-queue'
@Processor('dispatch-queue')
@Injectable()
// workerhost provides the process method hook, it runs in the background, completely separate from http request/response cycle
export class DispatchProcessor extends WorkerHost {
  private logger = new Logger(DispatchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driverService: DriverService,
    private readonly dispatchGateway: DispatchGateway,
  ) {
    super();
  }

  // the process method executes automatically whenever a job arrives in the queue
  async process(job: Job<DispatchJobData>): Promise<any> {
    const { deliveryId, restaurantLat, restaurantLng } = job.data;

    const currentAttempt = job.attemptsMade + 1; // bullmq starts from 0, so we add 1

    const currentRadius = 5 + (currentAttempt - 1) * 5;

    this.logger.log(
      `Processing dispatch job for Delivery #${deliveryId} (Attempt ${currentAttempt}, Radius: ${currentRadius}km)`,
    );

    // check if delivery is still searching
    const delivery = await this.prisma.delivery.findUnique({
      where: {
        id: deliveryId,
      },
      include: {
        order: { select: { id: true, total: true } },
      },
    });

    if (!delivery || delivery.status !== DeliveryStatus.SEARCHING) {
      this.logger.log(
        `Delivery #${deliveryId} is no longer SEARCHING (Current status: ${delivery?.status}). Stopping retry loop.`,
      );
      return { status: 'completed_or_cancelled' };
    }

    // search redis and postgres for nearby available drivers
    const nearbyDriverProfileIds =
      await this.driverService.findNearbyAvailableDrivers(
        restaurantLat,
        restaurantLng,
        currentRadius,
      );

    if (!nearbyDriverProfileIds || nearbyDriverProfileIds.length === 0) {
      this.logger.warn(
        `⚠️ No available drivers found within ${currentRadius}km for Delivery #${deliveryId}.`,
      );

      // if max attempt reached, mark delivery failed
      if (currentAttempt >= 5) {
        await this.prisma.delivery.update({
          where: { id: deliveryId },
          data: { status: DeliveryStatus.FAILED },
        });

        await this.prisma.$transaction(async (tx) => {
          await tx.delivery.update({
            where: { id: deliveryId },
            data: { status: DeliveryStatus.FAILED },
          });
          await tx.order.update({
            where: { id: delivery.orderId },
            data: { status: OrderStatus.CANCELLED },
          });
          await tx.payment.update({
            where: { orderId: delivery.orderId },
            data: { status: 'REFUNDED' },
          });
        });

        this.dispatchGateway.notifyOrderStatus(delivery.orderId, {
          status: 'ORDER_CANCELLED',
          reason: 'NO_DRIVERS_AVAILABLE',
          message:
            'We could not find a driver nearby. Your payment has been fully refunded.',
        });

        return { status: 'failed_and_refunded' };
      }
      // Throwing an error tells BullMQ to retry the job according to the queue backoff delay
      throw new Error(`Retrying dispatch for Delivery #${deliveryId}...`);
    }

    const topDrivers = nearbyDriverProfileIds.slice(0, 3);

    const restaurant = await this.prisma.restaurant.findFirst({
      where: { orders: { some: { id: delivery.orderId } } },
      select: { name: true },
    });

    const offerPayload = {
      orderId: delivery.orderId,
      deliveryId: delivery.id,
      restaurantName: restaurant?.name || 'Restaurant',
      totalAmount: delivery.order.total,
      message: 'New delivery offer nearby!',
    };

    for (const driverId of topDrivers) {
      this.dispatchGateway.notifyDriverNewOffer(driverId, offerPayload);
    }
    this.logger.log(
      `📢 Delivery #${deliveryId} offer pushed to ${topDrivers.length} nearby drivers`,
    );

    return { status: 'offer_sent', driverId: topDrivers };
  }
}
