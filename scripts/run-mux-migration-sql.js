import { Pool } from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env' });

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
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

async function runMuxMigration() {
  try {
    console.log('🔧 Running MUX columns migration...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-mux-columns.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ MUX columns migration completed successfully!\n');

    // Verify the columns exist
    const verifyResult = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'music_generations' 
        AND column_name IN ('mux_asset_id', 'mux_playback_id', 'mux_asset_status')
      ORDER BY column_name
    `);

    if (verifyResult.rows.length === 3) {
      console.log('✅ Verified columns:');
      verifyResult.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.warn('⚠️  Warning: Expected 3 columns, found:', verifyResult.rows.length);
      verifyResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error running migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runMuxMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

