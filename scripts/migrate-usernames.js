import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addUsernameColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding username column to users table...');
    
    // Add username column
    await client.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "username" varchar UNIQUE;
    `);
    
    console.log('✅ Username column added successfully');
    
    // Generate usernames for existing users
    console.log('Generating usernames for existing users...');
    
    const result = await client.query(`
      SELECT id, "firstName", "lastName", email 
      FROM "users" 
      WHERE "username" IS NULL
    `);
    
    for (const user of result.rows) {
      const baseUsername = `${user.firstName.toLowerCase()}${user.lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let counter = 1;
      
      // Ensure username is unique
      while (true) {
        const existing = await client.query(
          'SELECT id FROM "users" WHERE "username" = $1',
          [username]
        );
        
        if (existing.rows.length === 0) {
          break;
        }
        
        username = `${baseUsername}${counter}`;
        counter++;
      }
      
      await client.query(
        'UPDATE "users" SET "username" = $1 WHERE id = $2',
        [username, user.id]
      );
      
      console.log(`Generated username: ${username} for ${user.firstName} ${user.lastName}`);
    }
    
    console.log('✅ Usernames generated successfully');
    
  } catch (error) {
    console.error('❌ Error adding username column:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await addUsernameColumn();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
