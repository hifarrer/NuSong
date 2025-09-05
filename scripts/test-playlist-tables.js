import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testPlaylistTables() {
  const client = await pool.connect();
  
  try {
    console.log('Testing playlist tables...');
    
    // Check if playlists table exists
    const playlistsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'playlists'
      );
    `);
    
    console.log('Playlists table exists:', playlistsCheck.rows[0].exists);
    
    // Check if playlist_tracks table exists
    const tracksCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'playlist_tracks'
      );
    `);
    
    console.log('Playlist_tracks table exists:', tracksCheck.rows[0].exists);
    
    if (!playlistsCheck.rows[0].exists || !tracksCheck.rows[0].exists) {
      console.log('Creating missing tables...');
      
      if (!playlistsCheck.rows[0].exists) {
        await client.query(`
          CREATE TABLE playlists (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            description TEXT,
            is_public BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        console.log('✅ Created playlists table');
      }
      
      if (!tracksCheck.rows[0].exists) {
        await client.query(`
          CREATE TABLE playlist_tracks (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            playlist_id VARCHAR NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
            track_id VARCHAR NOT NULL REFERENCES music_generations(id) ON DELETE CASCADE,
            added_at TIMESTAMP DEFAULT NOW(),
            position INTEGER NOT NULL DEFAULT 0
          );
        `);
        console.log('✅ Created playlist_tracks table');
      }
      
      // Create indexes
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
      
      // Add unique constraint
      await client.query(`
        ALTER TABLE playlist_tracks 
        ADD CONSTRAINT IF NOT EXISTS unique_playlist_track 
        UNIQUE (playlist_id, track_id);
      `);
      
      console.log('✅ Created indexes and constraints');
    } else {
      console.log('✅ All playlist tables already exist!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await testPlaylistTables();
    console.log('🎉 Playlist tables are ready!');
  } catch (error) {
    console.error('💥 Failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
