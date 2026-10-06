import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@correo.com' })
  @IsEmail(
    {},
    {
      message: 'El correo electrónico no es válido',
    },
  )
  correo!: string;
}
