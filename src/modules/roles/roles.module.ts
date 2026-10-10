import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RolesController],
  providers: [RolesService, RolesGuard, PermissionsGuard],
})
export class RolesModule {}
