import { PrismaService, UserRole } from '@foodengine/database';
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/role.decorator.js';

@Injectable()
export class TenantRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // read required roles attached in @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // if no roles are specified allow by default
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user; // injected by authguardservice
    if (!user || !user.userId) {
      throw new ForbiddenException('User is missing');
    }

    if (user.role === UserRole.SYSTEM_ADMIN) return true;

    // Resource-specific guards may resolve a trusted tenant from the target
    // resource. Fall back to client-provided context for routes that need it.
    const tenantIdRaw =
      request.tenantId ||
      request.body?.tenantId ||
      request.params?.tenantId ||
      request.headers['x-tenant-id'];

    if (!tenantIdRaw) {
      throw new BadRequestException(
        'Tenant context (tenantId) is required for this action',
      );
    }
    const tenantId = Number(tenantIdRaw);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      throw new BadRequestException('Invalid tenantId');
    }

    // find user's role specifically for this tenant
    const membership = await this.prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId: user.userId,
          tenantId: tenantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Access denied: You are not a member of this tenant',
      );
    }

    // verify if membership role matches one of the required roles
    const hasRole = requiredRoles.includes(membership.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required role: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
