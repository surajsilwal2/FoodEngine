import { forwardRef, Module } from '@nestjs/common';
import { DispatchGateway } from './dispatch.gateway.js';
import { BullModule } from '@nestjs/bullmq';
import { DriverModule } from '../driver/driver.module.js';
import { DispatchProcessor } from './dispatch.processor.js';
import { DispatchService } from './dispatch.service.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'dispatch-queue',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      },
    }),
    forwardRef(() => DriverModule), // forwardRef is used to resolve circular dependency between DispatchModule and DriverModule. It allows the modules to reference each other without causing a circular import error.
  ],

  providers: [DispatchGateway, DispatchProcessor, DispatchService],
  exports: [DispatchGateway, DispatchService, BullModule],
})
export class DispatchModule {}
