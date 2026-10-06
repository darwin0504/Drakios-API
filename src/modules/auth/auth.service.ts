import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';

import { DB } from '../../database/database.provider';
import type { Database } from '../../database/database.provider';

import {
  roles,
  users,
  passwordResetTokens,
  emailVerificationTokens,
} from '../../db/schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
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

    const [defaultRole] = await this.db
      .select({
        id: roles.id,
        name: roles.name,
      })
      .from(roles)
      .where(eq(roles.name, 'USER'))
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
        name: dto.name.trim(),
        email,
        passwordHash,
        address: dto.address?.trim() || null,
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
      throw new InternalServerErrorException('Error al registrar usuario');
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
        '[AUTH] Error generando o enviando correo de verificación:',
        error,
      );

      throw new InternalServerErrorException(
        'El usuario fue registrado, pero no se pudo enviar el correo de verificación.',
      );
    }

    return {
      message:
        'Usuario registrado correctamente. Revisa tu correo para verificar tu cuenta.',
      user: created,
    };
  }

  async verifyEmail(token: string) {
    try {
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const [verificationToken] = await this.db
        .select({
          id: emailVerificationTokens.id,
          userId: emailVerificationTokens.userId,
          expiresAt: emailVerificationTokens.expiresAt,
          usedAt: emailVerificationTokens.usedAt,
        })
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.tokenHash, tokenHash))
        .limit(1);

      if (!verificationToken) {
        throw new BadRequestException(
          'El enlace de verificación no es válido.',
        );
      }

      if (verificationToken.usedAt) {
        throw new BadRequestException(
          'El enlace de verificación ya fue utilizado.',
        );
      }

      if (new Date() > verificationToken.expiresAt) {
        throw new BadRequestException('El enlace de verificación ha expirado.');
      }

      await this.db
        .update(users)
        .set({
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, verificationToken.userId));

      await this.db
        .update(emailVerificationTokens)
        .set({
          usedAt: new Date(),
        })
        .where(eq(emailVerificationTokens.id, verificationToken.id));

      return {
        message: 'Correo electrónico verificado correctamente.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('[AUTH] Error verificando correo:', error);

      throw new InternalServerErrorException(
        'No se pudo verificar el correo electrónico. Inténtalo nuevamente más tarde.',
      );
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const [user] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        address: users.address,
        roleId: users.roleId,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, email))
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
      email: user.email,
      name: user.name,
      roleId: user.roleId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Login correcto',
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();

    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return {
        message:
          'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.',
      };
    }

    if (user.status !== 'ACTIVE') {
      return {
        message:
          'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.',
      };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.db
      .update(passwordResetTokens)
      .set({
        usedAt: new Date(),
      })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!frontendUrl) {
      throw new InternalServerErrorException(
        'La URL del frontend no está configurada.',
      );
    }

    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);

    return {
      message:
        'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    const [resetToken] = await this.db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!resetToken) {
      throw new BadRequestException('El enlace de recuperación no es válido.');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException(
        'El enlace de recuperación ya fue utilizado.',
      );
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('El enlace de recuperación ha expirado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, resetToken.userId));

    await this.db
      .update(passwordResetTokens)
      .set({
        usedAt: new Date(),
      })
      .where(
        and(
          eq(passwordResetTokens.userId, resetToken.userId),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    return {
      message: 'Contraseña actualizada correctamente.',
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    try {
      const [user] = await this.db
        .select({
          id: users.id,
          passwordHash: users.passwordHash,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new UnauthorizedException(
          'El usuario no existe o la sesión no es válida.',
        );
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('La cuenta no está activa.');
      }

      const currentPasswordMatches = await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );

      if (!currentPasswordMatches) {
        throw new BadRequestException('La contraseña actual es incorrecta.');
      }

      const newPasswordMatchesCurrent = await bcrypt.compare(
        dto.newPassword,
        user.passwordHash,
      );

      if (newPasswordMatchesCurrent) {
        throw new BadRequestException(
          'La nueva contraseña debe ser diferente a la contraseña actual.',
        );
      }

      const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

      await this.db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        message: 'Contraseña actualizada correctamente.',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      console.error(
        '[AUTH] Error inesperado durante cambio de contraseña:',
        error,
      );

      throw new InternalServerErrorException(
        'No se pudo cambiar la contraseña. Inténtalo nuevamente más tarde.',
      );
    }
  }
}
