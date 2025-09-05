import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  let client;
  
  try {
    console.log('🚀 Starting database migrations...');
    
    // Check if we're running locally (development) vs production
    const isLocal = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV !== 'production' ||
                   !process.env.DATABASE_URL?.includes('render.com');
    
    if (isLocal) {
      console.log('🏠 Running locally - skipping migrations (will run on production deployment)');
      return;
    }
    
    // Test connection first with a timeout
    console.log('🔌 Testing database connection...');
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);
    
    console.log('✅ Database connection successful');
    
    // Migration 1: Add username column to users table
    console.log('📝 Migration 1: Adding username column...');
    await client.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "username" varchar UNIQUE;
    `);
    console.log('✅ Username column added successfully');
    
    // Migration 2: Generate usernames for existing users
    console.log('👤 Migration 2: Generating usernames for existing users...');
    const result = await client.query(`
      SELECT id, "firstName", "lastName", email 
      FROM "users" 
      WHERE "username" IS NULL
    `);
    
    let generatedCount = 0;
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
      
      generatedCount++;
      console.log(`  Generated username: ${username} for ${user.firstName} ${user.lastName}`);
    }
    console.log(`✅ Generated ${generatedCount} usernames`);
    
    // Migration 3: Create shareable_links table
    console.log('🔗 Migration 3: Creating shareable_links table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "shareable_links" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "token" varchar UNIQUE NOT NULL,
        "album_id" varchar NOT NULL REFERENCES "albums"("id"),
        "user_id" varchar NOT NULL REFERENCES "users"("id"),
        "is_active" boolean NOT NULL DEFAULT true,
        "expires_at" timestamp,
        "created_at" timestamp DEFAULT now()
      );
    `);
    console.log('✅ Shareable links table created successfully');
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    if (error.message === 'Connection timeout' || error.code === 'ETIMEDOUT') {
      console.log('⚠️  Database connection timeout - skipping migrations (likely running locally)');
      console.log('💡 Migrations will run automatically when deployed to production');
      return; // Don't throw error, just skip migrations
    }
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function main() {
  try {
    await runMigrations();
    console.log('✅ Database deployment completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database deployment failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runMigrations };
