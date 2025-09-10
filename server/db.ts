import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use external database credentials from environment variables
const EXTERNAL_DB_HOST = '4.240.90.166';
const EXTERNAL_DB_PORT = 5432;
const EXTERNAL_DB_NAME = process.env.EXTERNAL_DB_NAME;
const EXTERNAL_DB_USER = process.env.EXTERNAL_DB_USER;
const EXTERNAL_DB_PASSWORD = process.env.EXTERNAL_DB_PASSWORD;

if (!EXTERNAL_DB_NAME || !EXTERNAL_DB_USER || !EXTERNAL_DB_PASSWORD) {
  throw new Error('External database credentials are not set. Please provide EXTERNAL_DB_NAME, EXTERNAL_DB_USER, and EXTERNAL_DB_PASSWORD');
}

console.log(`Connecting to external database at ${EXTERNAL_DB_HOST}:${EXTERNAL_DB_PORT}`);
console.log(`Database: ${EXTERNAL_DB_NAME}, User: ${EXTERNAL_DB_USER}`);

export const pool = new Pool({
  host: EXTERNAL_DB_HOST,
  port: EXTERNAL_DB_PORT,
  database: EXTERNAL_DB_NAME,
  user: EXTERNAL_DB_USER,
  password: EXTERNAL_DB_PASSWORD,
  ssl: false,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle({ client: pool, schema, logger: true });