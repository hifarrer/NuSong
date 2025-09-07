import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding band_image_url column if missing...');
    await client.query(`
      ALTER TABLE bands
      ADD COLUMN IF NOT EXISTS band_image_url VARCHAR;
    `);
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});


