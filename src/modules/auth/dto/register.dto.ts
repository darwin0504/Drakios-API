import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Darwin Bedoya', minLength: 3 })
  @IsString()
  @MinLength(3, {
    message: 'El nombre debe tener al menos 3 caracteres',
  })
  nombre!: string;

  @ApiProperty({ example: 'darwinbedoya05@mail.com' })
  @IsEmail(
    {},
    {
      message: 'El correo electrónico no es válido',
    },
  )
  correo!: string;

  @ApiProperty({ example: 'Password123', minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @Matches(/[A-Za-z]/, {
    message: 'La contraseña debe contener al menos una letra',
  })
  @Matches(/[0-9]/, {
    message: 'La contraseña debe contener al menos un número',
  })
  password!: string;

  @ApiProperty({ example: 'Password123', minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: 'La confirmación de contraseña debe tener al menos 8 caracteres',
  })
  passwordConfirmation!: string;

  @ApiProperty({ example: 'Bogotá, Colombia', required: false })
  @IsOptional()
  @IsString()
  direccion?: string;
}
