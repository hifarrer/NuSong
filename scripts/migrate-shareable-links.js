import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createShareableLinksTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating shareable_links table...');
    
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
    
    console.log('✅ shareable_links table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating shareable_links table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createShareableLinksTable();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
