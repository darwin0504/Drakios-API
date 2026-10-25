import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import type { UploadedImage } from './types/uploaded-image.type';

@Injectable()
export class ProductImageStorageService {
  private readonly uploadDirectory = join(process.cwd(), 'uploads', 'products');

  private readonly publicDirectory = '/uploads/products';

  private readonly maxFileSize = 5 * 1024 * 1024;

  private readonly allowedMimeTypes = new Map([
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
  ]);

  async save(productId: number, file: UploadedImage): Promise<string> {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('Debes proporcionar una imagen válida');
    }

    if (file.size <= 0) {
      throw new BadRequestException('La imagen no puede estar vacía');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('La imagen no puede superar los 5 MB');
    }

    const detectedType = await fileTypeFromBuffer(file.buffer);

    if (!detectedType || !this.allowedMimeTypes.has(detectedType.mime)) {
      throw new BadRequestException(
        'Formato no permitido. Usa JPG, PNG o WEBP',
      );
    }

    const extension = this.allowedMimeTypes.get(detectedType.mime)!;

    const filename = `${productId}-${randomUUID()}${extension}`;

    const filepath = join(this.uploadDirectory, filename);

    try {
      await mkdir(this.uploadDirectory, {
        recursive: true,
      });

      await writeFile(filepath, file.buffer, {
        flag: 'wx',
      });
    } catch {
      throw new InternalServerErrorException(
        'No fue posible almacenar la imagen',
      );
    }

    return `${this.publicDirectory}/${filename}`;
  }

  async remove(imageUrl: string | null): Promise<void> {
    if (!imageUrl) {
      return;
    }

    const filename = basename(imageUrl);
    const safeFilename = /^\d+-[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename);

    if (!safeFilename) {
      throw new InternalServerErrorException(
        'La referencia de la imagen no es válida',
      );
    }

    const filepath = join(this.uploadDirectory, filename);

    try {
      await unlink(filepath);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }

      throw new InternalServerErrorException(
        'No fue posible eliminar la imagen',
      );
    }
  }
}
