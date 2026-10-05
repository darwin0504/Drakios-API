import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'darwinbedoya05@mail.com' })
  @IsEmail()
  correo!: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @MinLength(6)
  password!: string;
}
