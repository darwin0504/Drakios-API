import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Darwin Bedoya' })
  @IsString()
  @MinLength(3)
  nombre!: string;

  @ApiProperty({ example: 'darwinbedoya05@mail.com' })
  @IsEmail()
  correo!: string;

  @ApiProperty({ example: '123456789', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Bogotá, Colombia', required: false })
  @IsOptional()
  @IsString()
  direccion?: string;
}
