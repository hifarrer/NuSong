import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection string
const DATABASE_URL = 'postgresql://numusicuser:7w3PcD7S0u3xkhMlZyRRQtWCU6rVXtAQ@dpg-d2lpkeruibrs73fh0ar0-a.oregon-postgres.render.com/numusicdb';

// Create a new pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function verifyImport() {
  try {
    console.log('Verifying data import...\n');
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Check subscription plans
    const plansResult = await pool.query('SELECT COUNT(*) as count FROM subscription_plans');
    console.log(`📊 Subscription Plans: ${plansResult.rows[0].count} records`);
    
    const plans = await pool.query('SELECT name, max_generations, monthly_price FROM subscription_plans ORDER BY sort_order');
    plans.rows.forEach(plan => {
      console.log(`   - ${plan.name}: ${plan.max_generations} generations/month, $${plan.monthly_price}/month`);
    });
    console.log('');
    
    // Check users
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users: ${usersResult.rows[0].count} records`);
    
    const activeUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE plan_status = \'active\'');
    console.log(`   - Active users: ${activeUsers.rows[0].count}`);
    
    const freeUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE plan_status = \'free\'');
    console.log(`   - Free users: ${freeUsers.rows[0].count}`);
    console.log('');
    
    // Check admin users
    const adminResult = await pool.query('SELECT COUNT(*) as count FROM admin_users');
    console.log(`🔐 Admin Users: ${adminResult.rows[0].count} records`);
    
    const admins = await pool.query('SELECT username, email, role FROM admin_users');
    admins.rows.forEach(admin => {
      console.log(`   - ${admin.username} (${admin.email}) - ${admin.role}`);
    });
    console.log('');
    
    // Check sessions
    const sessionsResult = await pool.query('SELECT COUNT(*) as count FROM sessions');
    console.log(`🔑 Sessions: ${sessionsResult.rows[0].count} records\n`);
    
    // Check site settings
    const settingsResult = await pool.query('SELECT COUNT(*) as count FROM site_settings');
    console.log(`⚙️  Site Settings: ${settingsResult.rows[0].count} records`);
    
    const settings = await pool.query('SELECT key, category FROM site_settings ORDER BY category, key');
    settings.rows.forEach(setting => {
      console.log(`   - ${setting.key} (${setting.category})`);
    });
    console.log('');
    
    // Check usage analytics
    const analyticsResult = await pool.query('SELECT COUNT(*) as count FROM usage_analytics');
    console.log(`📈 Usage Analytics: ${analyticsResult.rows[0].count} records\n`);
    
    console.log('✅ Data import verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await pool.end();
  }
}

// Run the verification
verifyImport();
