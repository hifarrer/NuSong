import { Pool } from 'pg';
import 'dotenv/config';

console.log('Testing database connection...');

// Hardcode the values for testing
const dbConfig = {
  host: 'dpg-d2lpkeruibrs73fh0ar0-a.oregon-postgres.render.com',
  port: 5432,
  database: 'numusicdb',
  user: 'numusicuser',
  password: '7w3PcD7S0u3xkhMlZyRRQtWCU6rVXtAQ',
  ssl: {
    rejectUnauthorized: false
  }
};

async function testConnection() {
  const pool = new Pool({
    ...dbConfig,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 1,
  });

  try {
    console.log('\n🔧 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    const result = await client.query('SELECT NOW() as current_time, current_database() as db_name, current_user as user');
    console.log('Current database time:', result.rows[0].current_time);
    console.log('Database name:', result.rows[0].db_name);
    console.log('Current user:', result.rows[0].user);
    
    client.release();
    await pool.end();
    console.log('Connection closed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
}

testConnection();
