import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection string
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://numusicuser:7w3PcD7S0u3xkhMlZyRRQtWCU6rVXtAQ@dpg-d2lpkeruibrs73fh0ar0-a.oregon-postgres.render.com/numusicdb';

// Create a new pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addMuxColumns() {
  try {
    console.log('🔧 Adding MUX columns to music_generations table...');

    // Add mux_asset_id column
    await pool.query(`
      ALTER TABLE music_generations 
      ADD COLUMN IF NOT EXISTS mux_asset_id VARCHAR;
    `);
    console.log('✅ Added mux_asset_id column');

    // Add mux_playback_id column
    await pool.query(`
      ALTER TABLE music_generations 
      ADD COLUMN IF NOT EXISTS mux_playback_id VARCHAR;
    `);
    console.log('✅ Added mux_playback_id column');

    // Add mux_asset_status column
    await pool.query(`
      ALTER TABLE music_generations 
      ADD COLUMN IF NOT EXISTS mux_asset_status VARCHAR;
    `);
    console.log('✅ Added mux_asset_status column');

    console.log('✅ All MUX columns added successfully!');
  } catch (error) {
    console.error('❌ Error adding MUX columns:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
addMuxColumns()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

