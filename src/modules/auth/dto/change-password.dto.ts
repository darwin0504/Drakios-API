import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Password123', minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: 'La contraseña actual debe tener al menos 8 caracteres',
  })
  currentPassword!: string;

  @ApiProperty({
    example: 'NewPassword123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  newPassword!: string;
}
