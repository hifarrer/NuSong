import 'dotenv/config';
import { pool } from '../server/db.ts';

async function migrateAlbums() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting Albums migration...');

    // Create albums table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS albums (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        name VARCHAR NOT NULL,
        cover_url VARCHAR,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add album_id column to music_generations if not exists
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'music_generations' AND column_name = 'album_id'
    `);
    if (colCheck.rowCount === 0) {
      console.log('➕ Adding album_id column to music_generations...');
      await client.query(`
        ALTER TABLE music_generations 
        ADD COLUMN album_id VARCHAR REFERENCES albums(id)
      `);
    }

    // Ensure every user has a default album
    const usersRes = await client.query(`SELECT id FROM users`);
    for (const row of usersRes.rows) {
      const userId = row.id;
      const existing = await client.query(
        `SELECT id FROM albums WHERE user_id = $1 AND is_default = true LIMIT 1`,
        [userId]
      );
      let defaultAlbumId = existing.rows[0]?.id;
      if (!defaultAlbumId) {
        const created = await client.query(
          `INSERT INTO albums (user_id, name, is_default) VALUES ($1, $2, true) RETURNING id`,
          [userId, 'My Music']
        );
        defaultAlbumId = created.rows[0].id;
        console.log(`  ✅ Created default album for user ${userId}`);
      }
      // Assign missing album_id on music_generations
      await client.query(
        `UPDATE music_generations SET album_id = $1, updated_at = NOW() WHERE user_id = $2 AND album_id IS NULL`,
        [defaultAlbumId, userId]
      );
    }

    console.log('✅ Albums migration completed successfully!');
  } catch (err) {
    console.error('❌ Albums migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

migrateAlbums()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));


