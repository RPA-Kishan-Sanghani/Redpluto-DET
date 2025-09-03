import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Force external PostgreSQL database configuration (ignore any environment variables)
const externalDbConfig = {
  host: '4.240.90.166',
  port: 5432,
  database: 'config_db',
  user: 'rpdet_az',
  password: 'Rpdet#1234',
  ssl: false, // Local database, no SSL required
  connectionTimeoutMillis: 10000,
};

console.log('Forcing connection to external PostgreSQL:', externalDbConfig.host);
console.log('Database config:', JSON.stringify(externalDbConfig, null, 2));

export const pool = new Pool(externalDbConfig);
export const db = drizzle({ client: pool, schema });