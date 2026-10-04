import { ConfigService } from '@nestjs/config';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import * as schema from '../db/schema';

export const DB = Symbol('DB');

export type Database = MySql2Database<typeof schema>;

export const databaseProvider = {
  provide: DB,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const url = configService.get<string>('DATABASE_URL');

    if (!url) {
      console.error('[DB] DATABASE_URL no está configurada');
      throw new Error('DATABASE_URL no está configurada');
    }

    const pool = mysql.createPool({
      uri: url,
      connectionLimit: 10,
    });

    console.log('[DB] Pool MySQL creado correctamente');

    return drizzle(pool, {
      schema,
      mode: 'default',
    });
  },
};
