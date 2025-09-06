import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createBandTables() {
  const client = await pool.connect();
  
  try {
    console.log('Creating bands table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bands (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Creating band_members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS band_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        band_id VARCHAR NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        role VARCHAR NOT NULL,
        image_url VARCHAR,
        description TEXT,
        position INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bands_user_id ON bands(user_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_band_members_band_id ON band_members(band_id);
    `);

    console.log('Band tables created successfully!');
  } catch (error) {
    console.error('Error creating band tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

createBandTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
