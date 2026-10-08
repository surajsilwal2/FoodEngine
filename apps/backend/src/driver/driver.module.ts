import { forwardRef, Module } from '@nestjs/common';
import { DriverService } from './driver.service.js';
import { DriverController } from './driver.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard.js';
import { DispatchModule } from '../dispatch/dispatch.module.js';

@Module({
  imports: [AuthModule, forwardRef(() => DispatchModule)],
  controllers: [DriverController],
  providers: [DriverService, SystemAdminGuard],
  exports: [DriverService],
  
})
export class DriverModule {}