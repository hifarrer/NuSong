import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createPlaylistTables() {
  const client = await pool.connect();
  
  try {
    console.log('Creating playlist tables...');
    
    // Create playlists table
    await client.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        description TEXT,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create playlist_tracks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS playlist_tracks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        playlist_id VARCHAR NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        track_id VARCHAR NOT NULL REFERENCES music_generations(id) ON DELETE CASCADE,
        added_at TIMESTAMP DEFAULT NOW(),
        position INTEGER NOT NULL DEFAULT 0
      );
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
    `);
    
    // Add unique constraint to prevent duplicate tracks in the same playlist
    await client.query(`
      ALTER TABLE playlist_tracks 
      ADD CONSTRAINT IF NOT EXISTS unique_playlist_track 
      UNIQUE (playlist_id, track_id);
    `);
    
    console.log('✅ Playlist tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating playlist tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createPlaylistTables();
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

export { createPlaylistTables };
