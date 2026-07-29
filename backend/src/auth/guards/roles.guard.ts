import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user }: { user: User } = context.switchToHttp().getRequest();
    if (!user || !user.userRoles) {
      throw new ForbiddenException('Không có quyền truy cập tài nguyên này');
    }

    const userRoleCodes = user.userRoles.map((ur) => ur.role?.code);
    const hasRole = requiredRoles.some((role) => userRoleCodes.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        'Bạn không có quyền ADMIN để thực hiện thao tác này',
      );
    }

    return true;
  }
}
