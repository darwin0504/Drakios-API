import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DB } from '../../database/database.provider';
import type { Database } from '../../database/database.provider';
import { products } from '../../db/schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(dto: CreateProductDto) {
    const inserted = await this.db
      .insert(products)
      .values({
        name: dto.name,
        price: dto.price.toFixed(2),
        description: dto.description ?? null,
        quantity: dto.quantity,
      })
      .$returningId();

    const id = inserted[0]?.id;

    if (!id) {
      throw new InternalServerErrorException('Error al crear producto');
    }

    return this.findOne(id);
  }

  async findAll() {
    return this.db.select().from(products).orderBy(desc(products.id));
  }

  async findOne(id: number) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);

    const data = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.price !== undefined && { price: dto.price.toFixed(2) }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
    };

    if (Object.keys(data).length === 0) {
      return this.findOne(id);
    }

    await this.db.update(products).set(data).where(eq(products.id, id));

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.db.delete(products).where(eq(products.id, id));

    return {
      message: 'Producto eliminado correctamente',
      id,
    };
  }
}
