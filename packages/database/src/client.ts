import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function resolveDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!configured) {
      throw new Error('[database] DATABASE_URL is required in production.');
    }
    if (/novaflow:novaflow@|@localhost[:/]|@127\.0\.0\.1[:/]/i.test(configured)) {
      throw new Error('[database] Refusing development DATABASE_URL in production.');
    }
    return configured;
  }
  return configured || 'postgresql://novaflow:novaflow@localhost:5435/novaflow';
}

const connectionString = resolveDatabaseUrl();

const client = postgres(connectionString, {
  max: 10,
  prepare: false,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

export { schema };

export { databaseConfig } from './config';
