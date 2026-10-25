import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductImageStorageService } from './product-image-storage.service';
@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductImageStorageService, PermissionsGuard],
})
export class ProductsModule {}
