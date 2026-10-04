import {
  decimal,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),

  nombre: varchar('nombre', { length: 150 }).notNull(),

  correo: varchar('correo', { length: 180 }).notNull().unique(),

  passwordHash: varchar('password_hash', { length: 255 }).notNull(),

  direccion: varchar('direccion', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow(),

  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const products = mysqlTable('products', {
  id: int('id').autoincrement().primaryKey(),

  nombre: varchar('nombre', { length: 150 }).notNull(),

  precio: decimal('precio', { precision: 10, scale: 2 }).notNull(),

  descripcion: text('descripcion'),

  cantidad: int('cantidad').notNull().default(0),

  createdAt: timestamp('created_at').defaultNow(),

  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
