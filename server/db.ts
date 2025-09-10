
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use external PostgreSQL database
const DATABASE_CONFIG = {
  host: '4.240.90.166',
  port: 5432,
  database: 'config_db',
  user: 'rpdet_az',
  password: 'Rpdet#1234',
  ssl: false,
  connectionTimeoutMillis: 10000,
};

console.log('Connecting to external PostgreSQL database at', DATABASE_CONFIG.host);

export const pool = new Pool(DATABASE_CONFIG);

export const db = drizzle({ client: pool, schema, logger: true });

// Test the connection
pool.connect()
  .then(client => {
    console.log('Successfully connected to external PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('Failed to connect to external PostgreSQL database:', err.message);
  });
