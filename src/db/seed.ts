import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as bcrypt from 'bcrypt';

import { products, users } from './schema';

async function main() {
  console.log('[SEED] Iniciando carga de datos iniciales...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está configurada en el archivo .env');
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    const correoAdmin = 'admin@andercode.com';
    const passwordPlano = 'Admin123456';

    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.correo, correoAdmin))
      .limit(1);

    if (userExists.length === 0) {
      const passwordHash = await bcrypt.hash(passwordPlano, 10);

      await db.insert(users).values({
        nombre: 'Administrador',
        correo: correoAdmin,
        passwordHash,
        direccion: 'Perú',
      });

      console.log('[SEED] Usuario admin creado:', correoAdmin);
    } else {
      console.log('[SEED] Usuario admin ya existe. Se omite creación.');
    }

    const productosDemo = [
      {
        nombre: 'Laptop Lenovo ThinkPad',
        precio: '2499.90',
        descripcion: 'Laptop de trabajo para desarrollo backend.',
        cantidad: 5,
      },
      {
        nombre: 'Mouse Logitech MX',
        precio: '199.90',
        descripcion: 'Mouse inalámbrico para productividad.',
        cantidad: 12,
      },
      {
        nombre: 'Monitor Samsung 27',
        precio: '899.90',
        descripcion: 'Monitor para programación y multitarea.',
        cantidad: 7,
      },
    ];

    for (const item of productosDemo) {
      const productExists = await db
        .select()
        .from(products)
        .where(eq(products.nombre, item.nombre))
        .limit(1);

      if (productExists.length === 0) {
        await db.insert(products).values(item);
        console.log('[SEED] Producto creado:', item.nombre);
      } else {
        console.log('[SEED] Producto ya existe. Se omite:', item.nombre);
      }
    }

    console.log('[SEED] Carga de datos finalizada correctamente.');
    console.log('[SEED] Usuario demo: admin@andercode.com / Admin123456');
  } catch (error) {
    console.error('[SEED] Error durante la carga de datos:', error);
    process.exitCode = 1;
  } finally {
    await connection.end();
    console.log('[SEED] Conexión MySQL cerrada.');
  }
}

main();
