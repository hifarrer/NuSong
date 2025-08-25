import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = 'postgresql://numusicuser:7w3PcD7S0u3xkhMlZyRRQtWCU6rVXtAQ@dpg-d2lpkeruibrs73fh0ar0-a.oregon-postgres.render.com/numusicdb';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrationSQL = `
-- Add weekly pricing columns to subscription_plans table
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS weekly_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weekly_price_id VARCHAR;

-- Update existing plans with weekly pricing (monthly price / 4.33 weeks)
UPDATE subscription_plans 
SET weekly_price = ROUND(CAST(monthly_price AS DECIMAL) / 4.33, 2)
WHERE weekly_price IS NULL AND monthly_price IS NOT NULL AND monthly_price != '0.00';

-- Set weekly price to 0 for free plans
UPDATE subscription_plans 
SET weekly_price = 0.00
WHERE weekly_price IS NULL AND (monthly_price = '0.00' OR monthly_price IS NULL);
`;

async function migrateToWeekly() {
  try {
    console.log('🔄 Starting migration to weekly pricing...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Run migration
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    const result = await pool.query('SELECT name, weekly_price, monthly_price, yearly_price FROM subscription_plans ORDER BY sort_order');
    console.log('\n📊 Updated subscription plans:');
    result.rows.forEach(plan => {
      console.log(`- ${plan.name}: $${plan.weekly_price}/week, $${plan.monthly_price}/month, $${plan.yearly_price}/year`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrateToWeekly();
