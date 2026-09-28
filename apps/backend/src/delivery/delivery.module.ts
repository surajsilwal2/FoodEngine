import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service.js';
import { DeliveryController } from './delivery.controller.js';
import { DispatchModule } from '../dispatch/dispatch.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [DispatchModule,AuthModule],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
