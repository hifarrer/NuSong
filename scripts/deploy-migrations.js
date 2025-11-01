import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Debug: Log the DATABASE_URL before creating pool
console.log('🔍 DATABASE_URL for migrations:', process.env.DATABASE_URL);

// Clean the DATABASE_URL (remove any extra quotes or whitespace)
const cleanDatabaseUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, '');
console.log('🔍 Cleaned DATABASE_URL:', cleanDatabaseUrl);

// Try to parse the URL to check for issues
try {
  const url = new URL(cleanDatabaseUrl);
  console.log('🔍 Parsed URL components:');
  console.log('  Protocol:', url.protocol);
  console.log('  Host:', url.hostname);
  console.log('  Port:', url.port);
  console.log('  Database:', url.pathname.substring(1));
  console.log('  Username:', url.username);
} catch (e) {
  console.error('❌ Failed to parse DATABASE_URL:', e);
}

const pool = new Pool({
  connectionString: cleanDatabaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Prevent duplicate execution
let isRunning = false;

async function runMigrations() {
  if (isRunning) {
    console.log('⚠️  Migrations already running, skipping...');
    return;
  }
  
  isRunning = true;
  let client;
  
  try {
    console.log('🚀 Starting database migrations...');
    
    // Debug: Log environment info
    console.log('🔍 Environment check:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('  DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    // Check if we're running locally (development) vs production
    const isLocal = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV !== 'production' ||
                   !process.env.DATABASE_URL?.includes('render.com');
    
    if (isLocal) {
      console.log('🏠 Running locally - skipping migrations (will run on production deployment)');
      return;
    }
    
    // Test connection first with a timeout
    console.log('🔌 Testing database connection...');
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);
    
    console.log('✅ Database connection successful');
    
    // Migration 1: Add username column to users table
    console.log('📝 Migration 1: Adding username column...');
    await client.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "username" varchar UNIQUE;
    `);
    console.log('✅ Username column added successfully');
    
    // Migration 2: Generate usernames for existing users
    console.log('👤 Migration 2: Generating usernames for existing users...');
    const result = await client.query(`
      SELECT id, first_name, last_name, email 
      FROM "users" 
      WHERE "username" IS NULL
    `);
    
    let generatedCount = 0;
    for (const user of result.rows) {
      const baseUsername = `${user.first_name.toLowerCase()}${user.last_name.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let counter = 1;
      
      // Ensure username is unique
      while (true) {
        const existing = await client.query(
          'SELECT id FROM "users" WHERE "username" = $1',
          [username]
        );
        
        if (existing.rows.length === 0) {
          break;
        }
        
        username = `${baseUsername}${counter}`;
        counter++;
      }
      
      await client.query(
        'UPDATE "users" SET "username" = $1 WHERE id = $2',
        [username, user.id]
      );
      
      generatedCount++;
      console.log(`  Generated username: ${username} for ${user.first_name} ${user.last_name}`);
    }
    console.log(`✅ Generated ${generatedCount} usernames`);
    
    // Migration 3: Create shareable_links table
    console.log('🔗 Migration 3: Creating shareable_links table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "shareable_links" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "token" varchar UNIQUE NOT NULL,
        "album_id" varchar NOT NULL REFERENCES "albums"("id"),
        "user_id" varchar NOT NULL REFERENCES "users"("id"),
        "is_active" boolean NOT NULL DEFAULT true,
        "expires_at" timestamp,
        "created_at" timestamp DEFAULT now()
      );
    `);
    console.log('✅ Shareable links table created successfully');
    
    // Migration 4: Add audio/video generation tracking columns
    console.log('🎵 Migration 4: Adding audio/video generation tracking columns...');
    
    // Add columns to users table
    await client.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "audio_generations_used_this_month" INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "video_generations_used_this_month" INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('✅ Added audio/video generation columns to users table');
    
    // Add columns to subscription_plans table
    await client.query(`
      ALTER TABLE "subscription_plans" 
      ADD COLUMN IF NOT EXISTS "max_audio_generations" INTEGER NOT NULL DEFAULT 5;
    `);
    await client.query(`
      ALTER TABLE "subscription_plans" 
      ADD COLUMN IF NOT EXISTS "max_video_generations" INTEGER NOT NULL DEFAULT 1;
    `);
    console.log('✅ Added audio/video generation limit columns to subscription_plans table');
    
    // Update existing plans with default values based on plan name
    console.log('🔄 Updating existing subscription plans with default values...');
    
    // Free plan: 5 audio, 1 video
    await client.query(`
      UPDATE "subscription_plans" 
      SET "max_audio_generations" = 5, "max_video_generations" = 1
      WHERE (name ILIKE '%free%' OR name = 'Free') 
      AND ("max_audio_generations" = 5 OR "max_audio_generations" IS NULL)
      AND ("max_video_generations" = 1 OR "max_video_generations" IS NULL);
    `);
    
    // Basic plan: 30 audio, 5 video
    await client.query(`
      UPDATE "subscription_plans" 
      SET "max_audio_generations" = 30, "max_video_generations" = 5
      WHERE (name ILIKE '%basic%' OR name = 'Basic') 
      AND ("max_audio_generations" = 5 OR "max_audio_generations" IS NULL)
      AND ("max_video_generations" = 1 OR "max_video_generations" IS NULL);
    `);
    
    // Premium plan: 100 audio, 10 video
    await client.query(`
      UPDATE "subscription_plans" 
      SET "max_audio_generations" = 100, "max_video_generations" = 10
      WHERE (name ILIKE '%premium%' OR name = 'Premium') 
      AND ("max_audio_generations" = 5 OR "max_audio_generations" IS NULL)
      AND ("max_video_generations" = 1 OR "max_video_generations" IS NULL);
    `);
    
    // Ensure no NULL values remain
    await client.query(`
      UPDATE "subscription_plans" 
      SET "max_audio_generations" = COALESCE("max_audio_generations", 5),
          "max_video_generations" = COALESCE("max_video_generations", 1)
      WHERE "max_audio_generations" IS NULL OR "max_video_generations" IS NULL;
    `);
    
    console.log('✅ Updated existing subscription plans with default values');
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    if (error.message === 'Connection timeout' || error.code === 'ETIMEDOUT') {
      console.log('⚠️  Database connection timeout - skipping migrations (likely running locally)');
      console.log('💡 Migrations will run automatically when deployed to production');
      return; // Don't throw error, just skip migrations
    }
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    isRunning = false;
  }
}

// This script only exports the runMigrations function
// It should not execute anything when imported
console.log('📦 Migration script loaded (function exported)');

export { runMigrations };
