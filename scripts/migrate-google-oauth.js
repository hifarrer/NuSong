import 'dotenv/config';
import { pool } from '../server/db.ts';

async function migrateGoogleOAuth() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting Google OAuth database migration...');
    
    // Check if columns already exist
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('google_id', 'google_email', 'google_name', 'google_picture', 'auth_method')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('📋 Existing Google OAuth columns:', existingColumns);
    
    // Add Google OAuth fields to users table
    if (!existingColumns.includes('google_id')) {
      console.log('➕ Adding google_id column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN google_id VARCHAR UNIQUE
      `);
    }
    
    if (!existingColumns.includes('google_email')) {
      console.log('➕ Adding google_email column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN google_email VARCHAR
      `);
    }
    
    if (!existingColumns.includes('google_name')) {
      console.log('➕ Adding google_name column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN google_name VARCHAR
      `);
    }
    
    if (!existingColumns.includes('google_picture')) {
      console.log('➕ Adding google_picture column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN google_picture VARCHAR
      `);
    }
    
    if (!existingColumns.includes('auth_method')) {
      console.log('➕ Adding auth_method column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN auth_method VARCHAR NOT NULL DEFAULT 'email'
      `);
    }
    
    // Make password_hash optional for Google OAuth users
    console.log('🔧 Making password_hash optional...');
    await client.query(`
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL
    `);
    
    // Add index for Google ID lookups
    console.log('📊 Creating index for Google ID lookups...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)
    `);
    
    console.log('✅ Google OAuth migration completed successfully!');
    
    // Verify the migration
    const verifyColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('google_id', 'google_email', 'google_name', 'google_picture', 'auth_method', 'password_hash')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Migration verification:');
    verifyColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
migrateGoogleOAuth()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
