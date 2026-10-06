import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'TOKEN_DE_VERIFICACION' })
  @IsString()
  @MinLength(1, { message: 'El token es obligatorio' })
  token!: string;
}
