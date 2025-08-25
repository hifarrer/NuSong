import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection string (same as other scripts)
const DATABASE_URL = 'postgresql://numusicuser:7w3PcD7S0u3xkhMlZyRRQtWCU6rVXtAQ@dpg-d2lpkeruibrs73fh0ar0-a.oregon-postgres.render.com/numusicdb';

// Create a new pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateStripeFields() {
  const client = await pool.connect();
  
  try {
    console.log('Starting Stripe fields migration...');
    
    // Check if columns already exist
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('stripe_customer_id', 'stripe_subscription_id')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Add stripe_customer_id column if it doesn't exist
    if (!existingColumns.includes('stripe_customer_id')) {
      console.log('Adding stripe_customer_id column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN stripe_customer_id VARCHAR
      `);
      console.log('✅ Added stripe_customer_id column');
    } else {
      console.log('✅ stripe_customer_id column already exists');
    }
    
    // Add stripe_subscription_id column if it doesn't exist
    if (!existingColumns.includes('stripe_subscription_id')) {
      console.log('Adding stripe_subscription_id column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN stripe_subscription_id VARCHAR
      `);
      console.log('✅ Added stripe_subscription_id column');
    } else {
      console.log('✅ stripe_subscription_id column already exists');
    }
    
    console.log('🎉 Stripe fields migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
migrateStripeFields()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
