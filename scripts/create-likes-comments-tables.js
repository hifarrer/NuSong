import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createLikesCommentsTables() {
  const client = await pool.connect();
  
  try {
    console.log('Creating likes and comments tables...');
    
    // Create track_likes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS track_likes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        track_id VARCHAR NOT NULL REFERENCES music_generations(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(track_id, user_id)
      );
    `);
    
    // Create track_comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS track_comments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        track_id VARCHAR NOT NULL REFERENCES music_generations(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_track_likes_track_id ON track_likes(track_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_track_likes_user_id ON track_likes(user_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_track_comments_track_id ON track_comments(track_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_track_comments_user_id ON track_comments(user_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_track_comments_created_at ON track_comments(created_at);
    `);
    
    console.log('✅ Likes and comments tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createLikesCommentsTables();
    console.log('🎉 Database migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createLikesCommentsTables };

