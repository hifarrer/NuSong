import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

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

// Function to create tables using Drizzle
async function createTables() {
  try {
    console.log('Creating database tables...');
    
    // Set the DATABASE_URL environment variable
    process.env.DATABASE_URL = DATABASE_URL;
    
    // Run drizzle push to create tables
    execSync('npm run db:push', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('Database tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error.message);
    throw error;
  }
}

// Function to read JSON file
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Function to import users
async function importUsers() {
  const users = readJsonFile(path.join(__dirname, '../db/users.json'));
  if (!users || users.length === 0) {
    console.log('No users to import');
    return;
  }

  console.log(`Importing ${users.length} users...`);
  
  for (const user of users) {
    try {
      const query = `
        INSERT INTO users (
          id, email, first_name, last_name, password_hash, profile_image_url,
          email_verified, email_verification_token, email_verification_expiry,
          subscription_plan_id, plan_status, generations_used_this_month,
          plan_start_date, plan_end_date, password_reset_token, password_reset_expiry,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          password_hash = EXCLUDED.password_hash,
          profile_image_url = EXCLUDED.profile_image_url,
          email_verified = EXCLUDED.email_verified,
          email_verification_token = EXCLUDED.email_verification_token,
          email_verification_expiry = EXCLUDED.email_verification_expiry,
          subscription_plan_id = EXCLUDED.subscription_plan_id,
          plan_status = EXCLUDED.plan_status,
          generations_used_this_month = EXCLUDED.generations_used_this_month,
          plan_start_date = EXCLUDED.plan_start_date,
          plan_end_date = EXCLUDED.plan_end_date,
          password_reset_token = EXCLUDED.password_reset_token,
          password_reset_expiry = EXCLUDED.password_reset_expiry,
          updated_at = EXCLUDED.updated_at
      `;
      
      await pool.query(query, [
        user.id, user.email, user.first_name, user.last_name, user.password_hash,
        user.profile_image_url, user.email_verified, user.email_verification_token,
        user.email_verification_expiry, user.subscription_plan_id, user.plan_status,
        user.generations_used_this_month, user.plan_start_date, user.plan_end_date,
        user.password_reset_token, user.password_reset_expiry, user.created_at, user.updated_at
      ]);
    } catch (error) {
      console.error(`Error importing user ${user.email}:`, error.message);
    }
  }
  console.log('Users import completed');
}

// Function to import subscription plans
async function importSubscriptionPlans() {
  const plans = readJsonFile(path.join(__dirname, '../db/subscription_plans.json'));
  if (!plans || plans.length === 0) {
    console.log('No subscription plans to import');
    return;
  }

  console.log(`Importing ${plans.length} subscription plans...`);
  
  for (const plan of plans) {
    try {
      const query = `
        INSERT INTO subscription_plans (
          id, name, description, max_generations, features, is_active, sort_order,
          created_at, updated_at, monthly_price, yearly_price, monthly_price_id,
          yearly_price_id, generations_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          max_generations = EXCLUDED.max_generations,
          features = EXCLUDED.features,
          is_active = EXCLUDED.is_active,
          sort_order = EXCLUDED.sort_order,
          updated_at = EXCLUDED.updated_at,
          monthly_price = EXCLUDED.monthly_price,
          yearly_price = EXCLUDED.yearly_price,
          monthly_price_id = EXCLUDED.monthly_price_id,
          yearly_price_id = EXCLUDED.yearly_price_id,
          generations_number = EXCLUDED.generations_number
      `;
      
      await pool.query(query, [
        plan.id, plan.name, plan.description, plan.max_generations,
        typeof plan.features === 'string' ? plan.features : JSON.stringify(plan.features),
        plan.is_active, plan.sort_order, plan.created_at, plan.updated_at,
        plan.monthly_price, plan.yearly_price, plan.monthly_price_id,
        plan.yearly_price_id, plan.generations_number
      ]);
    } catch (error) {
      console.error(`Error importing plan ${plan.name}:`, error.message);
    }
  }
  console.log('Subscription plans import completed');
}

// Function to import admin users
async function importAdminUsers() {
  const adminUsers = readJsonFile(path.join(__dirname, '../db/admin_users.json'));
  if (!adminUsers || adminUsers.length === 0) {
    console.log('No admin users to import');
    return;
  }

  console.log(`Importing ${adminUsers.length} admin users...`);
  
  for (const adminUser of adminUsers) {
    try {
      const query = `
        INSERT INTO admin_users (
          id, username, password_hash, email, role, is_active, last_login_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          last_login_at = EXCLUDED.last_login_at,
          updated_at = EXCLUDED.updated_at
      `;
      
      await pool.query(query, [
        adminUser.id, adminUser.username, adminUser.password_hash, adminUser.email,
        adminUser.role, adminUser.is_active, adminUser.last_login_at,
        adminUser.created_at, adminUser.updated_at
      ]);
    } catch (error) {
      console.error(`Error importing admin user ${adminUser.username}:`, error.message);
    }
  }
  console.log('Admin users import completed');
}

// Function to import sessions
async function importSessions() {
  const sessions = readJsonFile(path.join(__dirname, '../db/sessions.json'));
  if (!sessions || sessions.length === 0) {
    console.log('No sessions to import');
    return;
  }

  console.log(`Importing ${sessions.length} sessions...`);
  
  for (const session of sessions) {
    try {
      const query = `
        INSERT INTO sessions (sid, sess, expire)
        VALUES ($1, $2, $3)
        ON CONFLICT (sid) DO UPDATE SET
          sess = EXCLUDED.sess,
          expire = EXCLUDED.expire
      `;
      
      await pool.query(query, [
        session.sid, JSON.stringify(session.sess), session.expire
      ]);
    } catch (error) {
      console.error(`Error importing session ${session.sid}:`, error.message);
    }
  }
  console.log('Sessions import completed');
}

// Function to import site settings
async function importSiteSettings() {
  const settings = readJsonFile(path.join(__dirname, '../db/site_settings.json'));
  if (!settings || settings.length === 0) {
    console.log('No site settings to import');
    return;
  }

  console.log(`Importing ${settings.length} site settings...`);
  
  for (const setting of settings) {
    try {
      const query = `
        INSERT INTO site_settings (
          id, key, value, description, type, category, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          description = EXCLUDED.description,
          type = EXCLUDED.type,
          category = EXCLUDED.category,
          updated_at = EXCLUDED.updated_at
      `;
      
      await pool.query(query, [
        setting.id, setting.key, setting.value, setting.description,
        setting.type, setting.category, setting.updated_at
      ]);
    } catch (error) {
      console.error(`Error importing setting ${setting.key}:`, error.message);
    }
  }
  console.log('Site settings import completed');
}

// Function to import usage analytics
async function importUsageAnalytics() {
  const analytics = readJsonFile(path.join(__dirname, '../db/usage_analytics.json'));
  if (!analytics || analytics.length === 0) {
    console.log('No usage analytics to import');
    return;
  }

  console.log(`Importing ${analytics.length} usage analytics records...`);
  
  for (const analytic of analytics) {
    try {
      const query = `
        INSERT INTO usage_analytics (
          id, date, total_users, new_users, total_generations,
          text_to_music_generations, audio_to_music_generations,
          public_tracks, private_tracks, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          date = EXCLUDED.date,
          total_users = EXCLUDED.total_users,
          new_users = EXCLUDED.new_users,
          total_generations = EXCLUDED.total_generations,
          text_to_music_generations = EXCLUDED.text_to_music_generations,
          audio_to_music_generations = EXCLUDED.audio_to_music_generations,
          public_tracks = EXCLUDED.public_tracks,
          private_tracks = EXCLUDED.private_tracks
      `;
      
      await pool.query(query, [
        analytic.id, analytic.date, analytic.total_users, analytic.new_users,
        analytic.total_generations, analytic.text_to_music_generations,
        analytic.audio_to_music_generations, analytic.public_tracks,
        analytic.private_tracks, analytic.created_at
      ]);
    } catch (error) {
      console.error(`Error importing analytics record ${analytic.id}:`, error.message);
    }
  }
  console.log('Usage analytics import completed');
}

// Main setup function
async function setupDatabase() {
  try {
    console.log('Starting database setup...');
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    
    // Create tables
    await createTables();
    
    // Import data in order (respecting foreign key constraints)
    await importSubscriptionPlans();
    await importUsers();
    await importAdminUsers();
    await importSessions();
    await importSiteSettings();
    await importUsageAnalytics();
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error during setup:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase();
