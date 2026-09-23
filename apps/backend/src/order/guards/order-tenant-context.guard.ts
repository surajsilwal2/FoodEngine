import { PrismaService } from '@foodengine/database';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class OrderTenantContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orderId = Number(request.params?.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new NotFoundException('Order not found');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: { tenantId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
      }
      
      request.tenantId = order.tenantId
    return true;
  }
}
