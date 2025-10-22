
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Admin Database (NeonDB PostgreSQL) - stores users, user_config_db_settings, user_activity
const ADMIN_DATABASE_CONFIG = {
  host: 'ep-misty-mountain-afd65hmo.c-2.us-west-2.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_A0aTlv5uOPHq',
  ssl: true,
  connectionTimeoutMillis: 10000,
};

console.log('Connecting to Admin Database (NeonDB) at', ADMIN_DATABASE_CONFIG.host);

export const pool = new Pool(ADMIN_DATABASE_CONFIG);

export const db = drizzle({ client: pool, schema, logger: true });

// Test the connection
pool.connect()
  .then(client => {
    console.log('Successfully connected to Admin Database (NeonDB)');
    client.release();
  })
  .catch(err => {
    console.error('Failed to connect to Admin Database:', err.message);
  });

// User-specific database pool cache
const userPools = new Map<string, Pool>();

// Create a user-specific database pool based on their config settings
export async function getUserSpecificPool(userId: string): Promise<{ pool: Pool; db: ReturnType<typeof drizzle> } | null> {
  // Import storage here to avoid circular dependency
  const { storage } = await import('./storage');
  
  // Check if user has configured database settings
  const settings = await storage.getUserConfigDbSettings(userId);
  
  if (!settings) {
    return null;
  }

  // Check if pool already exists in cache
  const cacheKey = `${userId}`;
  if (userPools.has(cacheKey)) {
    const existingPool = userPools.get(cacheKey)!;
    return {
      pool: existingPool,
      db: drizzle({ client: existingPool, schema })
    };
  }

  // Create new pool with user's settings
  const userPool = new Pool({
    host: settings.host,
    port: settings.port,
    database: settings.database,
    user: settings.username,
    password: settings.password,
    ssl: settings.sslEnabled ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: settings.connectionTimeout || 10000,
  });

  // Store in cache
  userPools.set(cacheKey, userPool);

  return {
    pool: userPool,
    db: drizzle({ client: userPool, schema })
  };
}

// Clean up user pool when needed
export function closeUserPool(userId: string): void {
  const cacheKey = `${userId}`;
  const userPool = userPools.get(cacheKey);
  if (userPool) {
    userPool.end();
    userPools.delete(cacheKey);
  }
}
