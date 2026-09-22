import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@foodengine/database';

/** Protects platform-wide operations that are not associated with a tenant. */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.user?.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('System administrator access is required');
    }

    return true;
  }
}
