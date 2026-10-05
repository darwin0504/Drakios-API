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

import { users } from '../../db/schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const [exists] = await this.db
      .select()
      .from(users)
      .where(eq(users.correo, dto.correo))
      .limit(1);

    if (exists) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.db.insert(users).values({
      nombre: dto.nombre,
      correo: dto.correo,
      passwordHash,
      direccion: dto.direccion ?? null,
    });

    const [created] = await this.db
      .select({
        id: users.id,
        nombre: users.nombre,
        correo: users.correo,
        direccion: users.direccion,
      })
      .from(users)
      .where(eq(users.correo, dto.correo))
      .limit(1);

    if (!created) {
      console.error('[AUTH] Error: usuario registrado pero no encontrado');
      throw new InternalServerErrorException('Error al registrar usuario');
    }

    return {
      message: 'Usuario registrado correctamente',
      user: created,
    };
  }

  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.correo, dto.correo))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload = {
      sub: user.id,
      correo: user.correo,
      nombre: user.nombre,
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
      },
    };
  }

  async logout(userId: number) {
    // Lógica para cerrar sesión (invalidar el token)

    return {
      message: 'Sesión cerrada correctamente.',
    };
  }
}
