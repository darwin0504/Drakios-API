import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';

import { DB } from '../../../database/database.provider';
import type { Database } from '../../../database/database.provider';
import { permissions, rolePermissions, users } from '../../../db/schema';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authenticatedUser = request.user;

    if (!authenticatedUser) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const [user] = await this.db
      .select({
        roleId: users.roleId,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, authenticatedUser.id))
      .limit(1);

    if (!user || user.status !== 'ACTIVE') {
      throw new ForbiddenException('La cuenta no está activa');
    }

    if (!user.roleId) {
      throw new ForbiddenException('El usuario no tiene un rol asignado');
    }

    const assignedPermissions = await this.db
      .select({
        name: permissions.name,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, user.roleId));

    const permissionNames = new Set(
      assignedPermissions.map((permission) => permission.name),
    );

    const hasAllPermissions = requiredPermissions.every((permission) =>
      permissionNames.has(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'No tienes los permisos necesarios para realizar esta acción',
      );
    }

    return true;
  }
}
