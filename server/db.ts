import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// External PostgreSQL database configuration
const externalDbConfig = {
  host: '4.240.90.166',
  port: 5432,
  database: 'config_db',
  user: 'rpdet_az',
  password: 'Rpdet#1234',
  ssl: false, // Local database, no SSL required
  connectionTimeoutMillis: 10000,
};

console.log('Database configured for external PostgreSQL:', externalDbConfig.host);

export const pool = new Pool(externalDbConfig);
export const db = drizzle({ client: pool, schema });