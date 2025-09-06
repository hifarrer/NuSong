import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

async function addViewCountColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('📊 Adding viewCount column to albums table...');
      await client.query(`
        ALTER TABLE albums 
        ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
      `);
      console.log('✅ Added viewCount column to albums table');

      console.log('📊 Adding viewCount column to music_generations table...');
      await client.query(`
        ALTER TABLE music_generations 
        ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
      `);
      console.log('✅ Added viewCount column to music_generations table');

      console.log('🎉 Migration completed successfully!');
      console.log('📈 View tracking is now enabled for albums and tracks');
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
addViewCountColumns();

export { addViewCountColumns };
