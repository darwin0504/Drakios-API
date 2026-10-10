import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({ example: '[1, 2, 3]' })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  permissionIds?: number[];
}
