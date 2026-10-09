import { DeliveryStatus, OrderStatus, PrismaService } from '@foodengine/database';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DriverService } from '../driver/driver.service.js';
import { DispatchGateway } from './dispatch.gateway.js';
import { Job } from 'bullmq';
import { DispatchSearchJobData, DispatchService } from './dispatch.service.js';

// Each round widens the search radius and, once every driver in range has been
// offered, doubles as a re-offer opportunity for drivers who have not answered.
const MAX_SEARCH_ROUNDS = 5;
const RETRY_DELAY_MS = 15_000;

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
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  // the process method executes automatically whenever a job arrives in the queue
  async process(job: Job<DispatchSearchJobData>) {
    try {
      return await this.processRound(job);
    } catch (error) {
      const maxAttempts = job.opts.attempts ?? 1;
      if (job.attemptsMade + 1 < maxAttempts) throw error;

      await this.flagDispatchAttention(
        job.data,
        'Driver matching could not reach the dispatch service. Retry dispatch.',
      );
      this.logger.error(
        `Dispatch infrastructure retries exhausted for Delivery #${job.data.deliveryId}`,
        error,
      );
      return { status: 'dispatch_needs_attention' };
    }
  }

  private async processRound(job: Job<DispatchSearchJobData>) {
    const data = job.data;
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: data.deliveryId },
      include: {
        order: {
          select: {
            id: true,
            total: true,
            status: true,
            restaurantId: true,
          },
        },
      },
    });

    if (
      !delivery ||
      delivery.status !== DeliveryStatus.SEARCHING ||
      (delivery.order.status !== OrderStatus.PREPARING &&
        delivery.order.status !== OrderStatus.READY_FOR_PICKUP)
    ) {
      return { status: 'delivery_not_searchable' };
    }

    if (data.attemptNumber > MAX_SEARCH_ROUNDS) {
      await this.flagDispatchAttention(
        data,
        'No driver accepted after five search rounds. Retry dispatch or arrange another pickup.',
      );

      return { status: 'dispatch_needs_attention' };
    }

    const radiusKm = 5 + (data.attemptNumber - 1) * 5;
    const previouslyOffered = new Set(data.offeredDriverProfileIds ?? []);
    const nearbyDriverProfileIds =
      await this.driverService.findNearbyAvailableDrivers(
        data.restaurantLat,
        data.restaurantLng,
        radiusKm,
      );

    // Prefer drivers who have not been offered during this ring yet. Once every
    // available candidate in range has been offered, start a fresh ring over the
    // drivers who are still available instead of conceding the round: an offer is
    // a live socket event, so a driver who was disconnected, missed the prompt or
    // simply did not answer must get another chance before the delivery is
    // escalated to the restaurant. offeredDriverProfileIds therefore tracks the
    // current ring only, not the whole search cycle.
    const unofferedDrivers = nearbyDriverProfileIds.filter(
      (driverId) => !previouslyOffered.has(driverId),
    );
    const isNewRing =
      unofferedDrivers.length === 0 && nearbyDriverProfileIds.length > 0;
    const driversToOffer = (
      isNewRing ? nearbyDriverProfileIds : unofferedDrivers
    ).slice(0, 3);

    const nextJob: DispatchSearchJobData = {
      ...data,
      attemptNumber: data.attemptNumber + 1,
      offeredDriverProfileIds: isNewRing
        ? driversToOffer
        : [...previouslyOffered, ...driversToOffer],
    };
    await this.dispatchService.enqueueSearch(nextJob, RETRY_DELAY_MS);

    if (driversToOffer.length === 0) {
      this.logger.warn(
        `No available drivers within ${radiusKm}km for Delivery #${delivery.id}`,
      );
      return { status: 'no_new_drivers', radiusKm };
    }

    if (isNewRing) {
      this.logger.log(
        `Offer ring restarted for Delivery #${delivery.id}: re-offering to ${driversToOffer.length} driver(s) within ${radiusKm}km`,
      );
    }

    const offerPayload = {
      orderId: delivery.orderId,
      deliveryId: delivery.id,
      restaurantName: data.restaurantName,
      restaurantLat: data.restaurantLat,
      restaurantLng: data.restaurantLng,
      totalAmount: delivery.order.total,
      message: 'New delivery offer nearby!',
    };

    for (const driverId of driversToOffer) {
      const currentDelivery = await this.prisma.delivery.findUnique({
        where: { id: delivery.id },
        select: { status: true, driverProfileId: true },
      });
      if (
        currentDelivery?.status !== DeliveryStatus.SEARCHING ||
        currentDelivery.driverProfileId !== null
      ) {
        break;
      }
      this.dispatchGateway.notifyDriverNewOffer(driverId, offerPayload);
    }

    this.logger.log(
      `Sent Delivery #${delivery.id} offers to ${driversToOffer.length} drivers within ${radiusKm}km`,
    );
    return { status: 'offers_sent', driverProfileIds: driversToOffer };
  }

  private async flagDispatchAttention(
    data: DispatchSearchJobData,
    message: string,
  ) {
    const result = await this.prisma.delivery.updateMany({
      where: {
        id: data.deliveryId,
        status: DeliveryStatus.SEARCHING,
        driverProfileId: null,
      },
      data: { status: DeliveryStatus.FAILED },
    });
    if (result.count !== 1) return;

    this.dispatchGateway.notifyRestaurantOrderChanged(data.restaurantId, {
      type: 'dispatch_attention',
      orderId: data.orderId,
      deliveryStatus: DeliveryStatus.FAILED,
      message,
    });
    this.dispatchGateway.notifyOrderStatus(data.orderId, {
      deliveryStatus: DeliveryStatus.FAILED,
      dispatchAttention: true,
    });
  }
}
