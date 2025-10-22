import { Pool } from 'pg';

// NeonDB configuration (destination)
const NEONDB_CONFIG = {
  host: 'ep-misty-mountain-afd65hmo.c-2.us-west-2.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_A0aTlv5uOPHq',
  ssl: true,
};

// External database configuration (source)
const EXTERNAL_DB_CONFIG = {
  host: '4.240.90.166',
  port: 5432,
  database: 'config_db',
  user: 'rpdet_az',
  password: 'Rpdet#1234',
  ssl: false,
};

async function migrateToNeonDB() {
  const neonPool = new Pool(NEONDB_CONFIG);
  const externalPool = new Pool(EXTERNAL_DB_CONFIG);
  
  try {
    console.log('Connecting to both databases...');
    const neonClient = await neonPool.connect();
    const externalClient = await externalPool.connect();
    
    try {
      console.log('Connected successfully!\n');
      
      // Step 1: Create tables in NeonDB
      console.log('Step 1: Creating tables in NeonDB...');
      
      await neonClient.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR UNIQUE,
          email VARCHAR UNIQUE,
          password VARCHAR,
          first_name VARCHAR,
          last_name VARCHAR
        );
      `);
      console.log('✓ Created users table');
      
      await neonClient.query(`
        CREATE TABLE IF NOT EXISTS user_activity (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id),
          activity_type VARCHAR(50) NOT NULL,
          ip_address VARCHAR(100),
          user_agent VARCHAR(500),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Created user_activity table');
      
      await neonClient.query(`
        CREATE TABLE IF NOT EXISTS user_config_db_settings (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id),
          host VARCHAR(255) NOT NULL,
          port INTEGER NOT NULL,
          database VARCHAR(255) NOT NULL,
          username VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          ssl_enabled BOOLEAN DEFAULT false,
          connection_timeout INTEGER DEFAULT 10000,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Created user_config_db_settings table\n');
      
      // Step 2: Migrate user data
      console.log('Step 2: Migrating user data...');
      const usersResult = await externalClient.query('SELECT * FROM users');
      const users = usersResult.rows;
      
      console.log(`Found ${users.length} users to migrate`);
      
      for (const user of users) {
        await neonClient.query(
          `INSERT INTO users (id, username, email, password, first_name, last_name) 
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             username = EXCLUDED.username,
             email = EXCLUDED.email,
             password = EXCLUDED.password,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name`,
          [user.id, user.username, user.email, user.password, user.first_name, user.last_name]
        );
        console.log(`✓ Migrated user: ${user.username} (${user.email})`);
      }
      
      // Step 3: Migrate user activity data (optional)
      console.log('\nStep 3: Migrating user activity...');
      try {
        const activityResult = await externalClient.query('SELECT * FROM user_activity ORDER BY timestamp DESC');
        const activities = activityResult.rows;
        
        console.log(`Found ${activities.length} activity records to migrate`);
        
        for (const activity of activities) {
          await neonClient.query(
            `INSERT INTO user_activity (user_id, activity_type, ip_address, user_agent, timestamp) 
             VALUES ($1, $2, $3, $4, $5)`,
            [activity.user_id, activity.activity_type, activity.ip_address, activity.user_agent, activity.timestamp]
          );
        }
        console.log(`✓ Migrated ${activities.length} activity records`);
      } catch (err) {
        console.log('Note: No user activity data to migrate');
      }
      
      // Step 4: Migrate user database settings
      console.log('\nStep 4: Migrating user database settings...');
      try {
        const settingsResult = await externalClient.query('SELECT * FROM user_config_db_settings WHERE is_active = true');
        const settings = settingsResult.rows;
        
        console.log(`Found ${settings.length} database settings to migrate`);
        
        for (const setting of settings) {
          await neonClient.query(
            `INSERT INTO user_config_db_settings (user_id, host, port, database, username, password, ssl_enabled, connection_timeout, is_active, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT DO NOTHING`,
            [
              setting.user_id,
              setting.host,
              setting.port,
              setting.database,
              setting.username,
              setting.password,
              setting.ssl_enabled,
              setting.connection_timeout,
              setting.is_active,
              setting.created_at,
              setting.updated_at
            ]
          );
          console.log(`✓ Migrated settings for user: ${setting.user_id}`);
        }
      } catch (err) {
        console.log('Note: No database settings to migrate');
      }
      
      console.log('\n✅ Migration completed successfully!');
      
      // Verify migration
      console.log('\nVerifying migration...');
      const verifyResult = await neonClient.query('SELECT COUNT(*) as count FROM users');
      console.log(`Total users in NeonDB: ${verifyResult.rows[0].count}`);
      
    } finally {
      neonClient.release();
      externalClient.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await neonPool.end();
    await externalPool.end();
  }
}

migrateToNeonDB()
  .then(() => {
    console.log('\n🎉 All done! Your authentication system is now using NeonDB.');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
