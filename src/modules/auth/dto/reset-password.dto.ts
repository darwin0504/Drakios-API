import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'TOKEN_DE_RECUPERACION' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NuevaPassword123', minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  password!: string;
}
