import { Pool } from 'pg';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addVideoColumn() {
  try {
    console.log('🎬 Adding video_url column to music_generations table...');
    
    // Add the video_url column
    await pool.query(`
      ALTER TABLE music_generations 
      ADD COLUMN IF NOT EXISTS video_url VARCHAR(255)
    `);
    
    console.log('✅ Successfully added video_url column to music_generations table');
    
  } catch (error) {
    console.error('❌ Error adding video column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
addVideoColumn()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
