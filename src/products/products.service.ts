import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DB } from '../database/database.provider';
import type { Database } from '../database/database.provider';
import { products } from '../db/schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(dto: CreateProductDto) {
    const inserted = await this.db
      .insert(products)
      .values({
        nombre: dto.nombre,
        precio: dto.precio.toFixed(2),
        descripcion: dto.descripcion ?? null,
        cantidad: dto.cantidad,
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
      ...(dto.nombre !== undefined && { nombre: dto.nombre }),
      ...(dto.precio !== undefined && { precio: dto.precio.toFixed(2) }),
      ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      ...(dto.cantidad !== undefined && { cantidad: dto.cantidad }),
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
