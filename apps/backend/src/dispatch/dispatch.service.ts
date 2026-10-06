import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export interface DispatchSearchJobData {
  orderId: number;
  deliveryId: number;
  restaurantId: number;
  restaurantLat: number;
  restaurantLng: number;
  restaurantName: string;
  cycleId: number;
  attemptNumber: number;
  offeredDriverProfileIds: number[];
}

/**
 * All dispatch job creation goes through this service so initial searches,
 * delayed re-offers, and merchant retries use the same idempotent job naming.
 */
@Injectable()
export class DispatchService {
  constructor(@InjectQueue('dispatch-queue') private readonly queue: Queue) {}

  async enqueueSearch(data: DispatchSearchJobData, delay = 0) {
    const jobId = `dispatch-${data.deliveryId}-${data.cycleId}-${data.attemptNumber}`;
    return this.queue.add('find-driver', data, {
      jobId,
      delay,
      attempts: 5,
      backoff: { type: 'fixed', delay: 15_000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}