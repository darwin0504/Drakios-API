import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

import { DB } from '../../database/database.provider';
import type { Database } from '../../database/database.provider';

import { roles, users } from '../../db/schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwtService: JwtService,
  ) { }

  async register(dto: RegisterDto) {
    const correo = dto.correo.trim().toLowerCase();

    const [exists] = await this.db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.correo, correo))
      .limit(1);

    if (exists) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }

    const [defaultRole] = await this.db
      .select({
        id: roles.id,
        nombre: roles.nombre,
      })
      .from(roles)
      .where(eq(roles.nombre, 'USER'))
      .limit(1);

    if (!defaultRole) {
      throw new InternalServerErrorException(
        'No se pudo determinar el rol inicial del usuario',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let userId: number;

    try {
      const result = await this.db.insert(users).values({
        nombre: dto.nombre.trim(),
        correo,
        passwordHash,
        direccion: dto.direccion?.trim() || null,
        roleId: defaultRole.id,
        status: 'ACTIVE',
      });

      userId = Number(result[0].insertId);
    } catch (error) {
      console.error('[AUTH] Error creando usuario:', error);

      throw new InternalServerErrorException('No se pudo registrar el usuario');
    }

    const [created] = await this.db
      .select({
        id: users.id,
        nombre: users.nombre,
        correo: users.correo,
        direccion: users.direccion,
        roleId: users.roleId,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!created) {
      throw new InternalServerErrorException('Error al registrar usuario');
    }

    return {
      message: 'Usuario registrado correctamente',
      user: created,
    };
  }

  async login(dto: LoginDto) {
    const correo = dto.correo.trim().toLowerCase();

    const [user] = await this.db
      .select({
        id: users.id,
        nombre: users.nombre,
        correo: users.correo,
        passwordHash: users.passwordHash,
        direccion: users.direccion,
        roleId: users.roleId,
        status: users.status,
      })
      .from(users)
      .where(eq(users.correo, correo))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('El usuario no se encuentra activo');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload = {
      sub: user.id,
      correo: user.correo,
      nombre: user.nombre,
      roleId: user.roleId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Login correcto',
      access_token: accessToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        direccion: user.direccion,
        roleId: user.roleId,
        status: user.status,
      },
    };
  }

  async logout(userId: number) {
    return {
      message: 'Sesión cerrada correctamente.',
    };
  }
}
