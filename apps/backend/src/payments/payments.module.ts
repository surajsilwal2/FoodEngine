import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { DriverModule } from '../driver/driver.module.js';
import { DispatchModule } from '../dispatch/dispatch.module.js';

@Module({
  // Payments coordinates delivery matching, so it imports the modules that
  // explicitly export DriverService and DispatchGateway for Nest DI.
  imports: [AuthModule, DriverModule, DispatchModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
