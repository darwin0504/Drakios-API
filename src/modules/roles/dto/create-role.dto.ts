import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'SUPERVISOR' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message:
      'El nombre debe usar mayúsculas, números y guiones bajos, y comenzar con una letra',
  })
  name!: string;

  @ApiProperty({ example: 'Descripción de supervisor' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
