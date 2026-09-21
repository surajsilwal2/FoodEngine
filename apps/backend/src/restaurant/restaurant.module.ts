import { Module } from '@nestjs/common';
import { RestaurantController } from './restaurant.controller.js';
import { RestaurantService } from './restaurant.service.js';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { RestaurantTenantContextGuard } from './guards/restaurant-tenant-context.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [RestaurantController],
  providers: [RestaurantService, TenantRoleGuard, RestaurantTenantContextGuard],
})
export class RestaurantModule {}
