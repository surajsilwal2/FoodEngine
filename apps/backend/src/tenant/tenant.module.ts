import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [TenantController],
  providers: [TenantService, SystemAdminGuard],
  exports: [TenantService],
})
export class TenantModule {}
