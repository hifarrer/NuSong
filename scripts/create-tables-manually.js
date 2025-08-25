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

// SQL to create tables based on the schema
const createTablesSQL = `
-- Session storage table
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Create index for session expiry
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2),
  yearly_price DECIMAL(10,2),
  monthly_price_id VARCHAR,
  yearly_price_id VARCHAR,
  max_generations INTEGER NOT NULL DEFAULT 5,
  generations_number INTEGER NOT NULL DEFAULT 5,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  password_hash VARCHAR NOT NULL,
  profile_image_url VARCHAR,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verification_token VARCHAR,
  email_verification_expiry TIMESTAMP,
  password_reset_token VARCHAR,
  password_reset_expiry TIMESTAMP,
  subscription_plan_id VARCHAR REFERENCES subscription_plans(id),
  plan_status VARCHAR NOT NULL DEFAULT 'free',
  generations_used_this_month INTEGER NOT NULL DEFAULT 0,
  plan_start_date TIMESTAMP,
  plan_end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Music generations table
CREATE TABLE IF NOT EXISTS music_generations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  type VARCHAR NOT NULL DEFAULT 'text-to-music',
  tags TEXT NOT NULL,
  lyrics TEXT,
  duration INTEGER,
  input_audio_url VARCHAR,
  audio_url VARCHAR,
  seed INTEGER,
  status VARCHAR NOT NULL DEFAULT 'pending',
  visibility VARCHAR NOT NULL DEFAULT 'public',
  show_in_gallery BOOLEAN NOT NULL DEFAULT true,
  title VARCHAR,
  fal_request_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  role VARCHAR NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  type VARCHAR NOT NULL DEFAULT 'text',
  category VARCHAR NOT NULL DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP NOT NULL,
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_generations INTEGER DEFAULT 0,
  text_to_music_generations INTEGER DEFAULT 0,
  audio_to_music_generations INTEGER DEFAULT 0,
  public_tracks INTEGER DEFAULT 0,
  private_tracks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

async function createTables() {
  try {
    console.log('Creating database tables manually...');
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    
    // Create tables
    await pool.query(createTablesSQL);
    console.log('Database tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

// Run the table creation
createTables();
