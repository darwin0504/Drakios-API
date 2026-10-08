import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../database/database.provider';
import type { Database } from '../../database/database.provider';
import { roles, users } from '../../db/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findAll() {
    const result = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        address: users.address,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleId: roles.id,
        roleName: roles.name,
        roleDescription: roles.description,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id));

    return result.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.roleId
        ? {
            id: user.roleId,
            name: user.roleName,
            description: user.roleDescription,
          }
        : null,
    }));
  }
}
