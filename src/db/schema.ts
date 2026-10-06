import {
  decimal,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

export const roles = mysqlTable('roles', {
  id: int('id').autoincrement().primaryKey(),

  name: varchar('name', { length: 50 }).notNull().unique(),

  description: varchar('description', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow(),

  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),

  name: varchar('name', { length: 150 }).notNull(),

  email: varchar('email', { length: 180 }).notNull().unique(),

  passwordHash: varchar('password_hash', { length: 255 }).notNull(),

  emailVerifiedAt: timestamp('email_verified_at'),

  address: varchar('address', { length: 255 }),

  roleId: int('role_id')
    .notNull()
    .references(() => roles.id),

  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),

  createdAt: timestamp('created_at').defaultNow(),

  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: int('id').autoincrement().primaryKey(),

  userId: int('user_id')
    .notNull()
    .references(() => users.id),

  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),

  expiresAt: timestamp('expires_at').notNull(),

  usedAt: timestamp('used_at'),

  createdAt: timestamp('created_at').defaultNow(),
});

export const emailVerificationTokens = mysqlTable('email_verification_tokens', {
  id: int('id').autoincrement().primaryKey(),

  userId: int('user_id')
    .notNull()
    .references(() => users.id),

  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),

  expiresAt: timestamp('expires_at').notNull(),

  usedAt: timestamp('used_at'),

  createdAt: timestamp('created_at').defaultNow(),
});

export const products = mysqlTable('products', {
  id: int('id').autoincrement().primaryKey(),

  name: varchar('name', { length: 150 }).notNull(),

  price: decimal('price', { precision: 10, scale: 2 }).notNull(),

  description: text('description'),

  quantity: int('quantity').notNull().default(0),

  createdAt: timestamp('created_at').defaultNow(),

  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
