import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import { DB } from '../../database/database.provider';
import type { Database } from '../../database/database.provider';
import { permissions, rolePermissions, roles, users } from '../../db/schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(dto: CreateRoleDto) {
    const name = dto.name.trim();

    const [existingRole] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);

    if (existingRole) {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }

    const [created] = await this.db.insert(roles).values({
      name,
      description: dto.description?.trim() || null,
    });

    const roleId = Number(created.insertId);

    const [role] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    return {
      message: 'Rol creado correctamente',
      role,
    };
  }

  async findAll() {
    return this.db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .orderBy(roles.id);
  }

  async update(id: number, dto: UpdateRoleDto) {
    const [existingRole] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (!existingRole) {
      throw new NotFoundException('El rol no existe');
    }

    const values: {
      name?: string;
      description?: string | null;
    } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      const [duplicate] = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, name))
        .limit(1);

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('Ya existe otro rol con ese nombre');
      }

      values.name = name;
    }

    if (dto.description !== undefined) {
      values.description = dto.description.trim() || null;
    }

    if (Object.keys(values).length === 0) {
      return {
        message: 'No hay cambios para actualizar',
        role: existingRole,
      };
    }

    await this.db.update(roles).set(values).where(eq(roles.id, id));

    const [updatedRole] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    return {
      message: 'Rol actualizado correctamente',
      role: updatedRole,
    };
  }

  async remove(id: number) {
    const [existingRole] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (!existingRole) {
      throw new NotFoundException('El rol no existe');
    }

    if (['ADMIN', 'USER'].includes(existingRole.name)) {
      throw new BadRequestException(
        'No se pueden eliminar los roles predeterminados del sistema',
      );
    }

    const [assignedUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.roleId, id))
      .limit(1);

    if (assignedUser) {
      throw new ConflictException(
        'No se puede eliminar un rol que tiene usuarios asignados',
      );
    }

    await this.db.delete(roles).where(eq(roles.id, id));

    return {
      message: 'Rol eliminado correctamente',
    };
  }

  async assignPermissions(roleId: number, permissionIds: number[] = []) {
    const [role] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) {
      throw new NotFoundException('El rol no existe');
    }

    const uniqueIds = [...new Set(permissionIds)];

    if (uniqueIds.length > 0) {
      const existingPermissions = await this.db
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.id, uniqueIds));

      if (existingPermissions.length !== uniqueIds.length) {
        throw new BadRequestException('Uno o más permisos no existen');
      }
    }

    // Replace the previous assignment with the received list
    await this.db.transaction(async (tx) => {
      await tx
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      if (uniqueIds.length > 0) {
        await tx.insert(rolePermissions).values(
          uniqueIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        );
      }
    });

    return {
      message: 'Permisos asignados correctamente',
      roleId,
      permissionIds: uniqueIds,
    };
  }

  async findAllPermissions() {
    return this.db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
      })
      .from(permissions)
      .orderBy(permissions.id);
  }

  async findRolePermissions(roleId: number) {
    const [role] = await this.db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) {
      throw new NotFoundException('El rol no existe');
    }

    const assignedPermissions = await this.db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))
      .orderBy(permissions.id);

    return {
      role,
      permissions: assignedPermissions,
    };
  }
}
