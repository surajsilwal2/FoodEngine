import { Module } from '@nestjs/common';
import { MenuService } from './menu.service.js';
import { MenuController } from './menu.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { TenantRoleGuard } from '../auth/guards/tenant-role.guard.js';
import { MenuItemTenantContextGuard } from './guards/menu-item-tenant-context.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [MenuController],
  providers: [MenuService, TenantRoleGuard, MenuItemTenantContextGuard],
  exports: [MenuService]
})
export class MenuModule {}
