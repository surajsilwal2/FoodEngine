import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@foodengine/database';

/**
 * Resolves the tenant from the menu item being changed. This ensures tenant
 * authorization is based on the stored resource, not client input.
 */
@Injectable()
export class MenuItemTenantContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const menuItemId = Number(request.params?.id);

    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      throw new NotFoundException('Menu item not found');
    }

    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, deletedAt: null },
      select: { tenantId: true },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    request.tenantId = menuItem.tenantId;
    return true;
  }
}
