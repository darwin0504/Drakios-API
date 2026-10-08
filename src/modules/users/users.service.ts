import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';

import { DB } from '../../database/database.provider';
import type { Database } from '../../database/database.provider';
import { emailVerificationTokens, roles, users } from '../../db/schema';
import { CreateUserDto } from './dto/create-user.dto';

import { MailService } from '../auth/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

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

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const [exists] = await this.db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (exists) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }

    const [role] = await this.db
      .select({
        id: roles.id,
        name: roles.name,
      })
      .from(roles)
      .where(eq(roles.name, dto.role))
      .limit(1);

    if (!role) {
      throw new NotFoundException(`El rol ${dto.role} no existe`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let userId: number;

    try {
      const result = await this.db.insert(users).values({
        name: dto.name.trim(),
        email,
        passwordHash,
        address: dto.address?.trim() || null,
        roleId: role.id,
        status: dto.status ?? 'ACTIVE',
      });

      userId = Number(result[0].insertId);
    } catch (error) {
      console.error('[USERS] Error creando usuario:', error);

      throw new InternalServerErrorException('No se pudo crear el usuario');
    }

    const [created] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        address: users.address,
        roleId: users.roleId,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!created) {
      throw new InternalServerErrorException('Error al crear usuario');
    }

    try {
      const verificationToken = randomBytes(32).toString('hex');

      const verificationTokenHash = createHash('sha256')
        .update(verificationToken)
        .digest('hex');

      const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await this.db.insert(emailVerificationTokens).values({
        userId,
        tokenHash: verificationTokenHash,
        expiresAt: verificationExpiresAt,
      });

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');

      if (!frontendUrl) {
        throw new InternalServerErrorException(
          'FRONTEND_URL no está configurada.',
        );
      }

      const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

      await this.mailService.sendEmailVerificationEmail(email, verificationUrl);
    } catch (error) {
      console.error(
        '[USERS] Error generando o enviando correo de verificación:',
        error,
      );

      throw new InternalServerErrorException(
        'El usuario fue creado, pero no se pudo enviar el correo de verificación.',
      );
    }

    return {
      message:
        'Usuario creado correctamente. Se envió un correo para verificar la cuenta.',
      user: created,
    };
  }
}
