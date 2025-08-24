
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './db';
import { sql } from 'drizzle-orm';

async function populateDatabase() {
  try {
    console.log('Starting database population...');
    
    // Read the SQL file
    const sqlContent = readFileSync(join(process.cwd(), 'populate_dummy_data.sql'), 'utf-8');
    
    // Split by semicolons to get individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await db.execute(sql.raw(statement));
      }
    }
    
    console.log('Database population completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
}

populateDatabase();
