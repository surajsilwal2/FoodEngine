import { Module } from '@nestjs/common';
import { DispatchGateway } from './dispatch.gateway.js';
import { BullModule } from '@nestjs/bullmq';
import { DriverModule } from '../driver/driver.module.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'dispatch-queue',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      },
    }),
    DriverModule,
  ],

  providers: [DispatchGateway],
  exports: [DispatchGateway, BullModule],
})
export class DispatchModule {}
