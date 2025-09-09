import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// FORCE OVERRIDE: Completely ignore DATABASE_URL and all environment variables
// Connect ONLY to external PostgreSQL at 4.240.90.166
delete process.env.DATABASE_URL;
delete process.env.PGHOST;
delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGDATABASE;
delete process.env.PGPORT;

const externalDbConfig = {
  host: '4.240.90.166',
  port: 5432,
  database: 'config_db',
  user: 'rpdet_az',
  password: 'Rpdet#1234',
  ssl: false,
  connectionTimeoutMillis: 10000,
};

console.log('FORCED OVERRIDE: Connecting ONLY to external PostgreSQL:', externalDbConfig.host);
console.log('External database config:', JSON.stringify(externalDbConfig, null, 2));
console.log('Environment DATABASE_URL deleted:', !process.env.DATABASE_URL);

export const pool = new Pool(externalDbConfig);
export const db = drizzle({ client: pool, schema, logger: true });