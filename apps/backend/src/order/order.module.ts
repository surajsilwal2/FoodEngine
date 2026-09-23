import { Module } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrderTenantContextGuard } from './guards/order-tenant-context.guard.js';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard.js';
import { RestaurantTenantContextGuard } from '../restaurant/guards/restaurant-tenant-context.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderTenantContextGuard,
    RestaurantTenantContextGuard,
    TenantRoleGuard,
  ],
  exports: [OrderService],
})
export class OrderModule {}
