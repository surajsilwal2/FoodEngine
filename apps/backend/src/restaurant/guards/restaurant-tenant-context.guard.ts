import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@foodengine/database';

/**
 * Resolves the tenant from the restaurant being acted on. This prevents a
 * caller from choosing an unrelated tenant through a request header or body.
 */
@Injectable()
export class RestaurantTenantContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const restaurantId = Number(request.params?.restaurantId);

    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new NotFoundException('Restaurant not found');
    }

    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, deletedAt: null },
      select: { tenantId: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    request.tenantId = restaurant.tenantId;
    return true;
  }
}
