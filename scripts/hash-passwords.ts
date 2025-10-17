import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const ADMIN_DATABASE_CONFIG = {
  host: '4.240.90.166',
  port: 5432,
  database: 'config_db',
  user: 'rpdet_az',
  password: 'Rpdet#1234',
  ssl: false,
};

async function hashPasswords() {
  const pool = new Pool(ADMIN_DATABASE_CONFIG);
  
  try {
    console.log('Connecting to admin database...');
    const client = await pool.connect();
    
    try {
      // Fetch all users
      const result = await client.query('SELECT id, username, email, password FROM users');
      const users = result.rows;
      
      console.log(`Found ${users.length} users to process`);
      
      for (const user of users) {
        // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          console.log(`Skipping ${user.username} - password already hashed`);
          continue;
        }
        
        // Hash the plain text password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Update the user's password
        await client.query(
          'UPDATE users SET password = $1 WHERE id = $2',
          [hashedPassword, user.id]
        );
        
        console.log(`✓ Hashed password for ${user.username} (${user.email})`);
      }
      
      console.log('\nPassword hashing completed successfully!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error hashing passwords:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

hashPasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
