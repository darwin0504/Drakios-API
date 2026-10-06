import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as bcrypt from 'bcrypt';

import { products, roles, users } from './schema';

async function main() {
  console.log('[SEED] Iniciando carga de datos iniciales...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está configurada en el archivo .env');
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    // ==========================================
    // ROLES
    // ==========================================

    const rolesIniciales = [
      {
        name: 'ADMIN',
        description: 'Administrador del sistema',
      },
      {
        name: 'USER',
        description: 'Usuario estándar',
      },
    ];

    for (const role of rolesIniciales) {
      const [existingRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, role.name))
        .limit(1);

      if (!existingRole) {
        await db.insert(roles).values(role);

        console.log(`[SEED] Rol creado: ${role.name}`);
      } else {
        console.log(`[SEED] Rol ya existe: ${role.name}`);
      }
    }

    // ==========================================
    // OBTENER ROL ADMIN
    // ==========================================

    const [adminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'ADMIN'))
      .limit(1);

    if (!adminRole) {
      throw new Error('No se pudo obtener el rol ADMIN');
    }

    // ==========================================
    // USUARIO ADMIN
    // ==========================================

    const emailAdmin = 'darwinbedoya05@gmail.com';

    const [userExists] = await db
      .select()
      .from(users)
      .where(eq(users.email, emailAdmin))
      .limit(1);

    if (!userExists) {
      const passwordPlano = 'Admin123456';

      const passwordHash = await bcrypt.hash(passwordPlano, 10);

      await db.insert(users).values({
        name: 'Administrador',
        email: emailAdmin,
        passwordHash,
        address: 'Colombia',
        roleId: adminRole.id,
        status: 'ACTIVE',
      });

      console.log('[SEED] Usuario administrador creado.');
    } else {
      console.log('[SEED] Usuario admin ya existe. Se omite creación.');
    }

    // ==========================================
    // PRODUCTOS DEMO
    // ==========================================

    const productosDemo = [
      {
        name: 'Laptop Lenovo ThinkPad',
        price: '2499.90',
        description: 'Laptop de trabajo para desarrollo backend.',
        quantity: 5,
      },
      {
        name: 'Mouse Logitech MX',
        price: '199.90',
        description: 'Mouse inalámbrico para productividad.',
        quantity: 12,
      },
      {
        name: 'Monitor Samsung 27',
        price: '899.90',
        description: 'Monitor para programación y multitarea.',
        quantity: 7,
      },
    ];

    for (const item of productosDemo) {
      const [productExists] = await db
        .select()
        .from(products)
        .where(eq(products.name, item.name))
        .limit(1);

      if (!productExists) {
        await db.insert(products).values(item);

        console.log(`[SEED] Producto creado: ${item.name}`);
      } else {
        console.log(`[SEED] Producto ya existe: ${item.name}`);
      }
    }

    console.log('[SEED] Carga de datos finalizada correctamente.');
  } catch (error) {
    console.error('[SEED] Error durante la carga de datos:', error);

    process.exitCode = 1;
  } finally {
    await connection.end();

    console.log('[SEED] Conexión MySQL cerrada.');
  }
}

main();
