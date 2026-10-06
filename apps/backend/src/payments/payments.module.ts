import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { DispatchModule } from '../dispatch/dispatch.module.js';

@Module({
  imports: [AuthModule, DispatchModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
