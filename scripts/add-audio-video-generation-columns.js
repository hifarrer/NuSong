import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

async function addAudioVideoGenerationColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Connecting to database...');
    const client = await pool.connect();
    
    try {
      // Add columns to users table
      console.log('📊 Adding audio_generations_used_this_month column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS audio_generations_used_this_month INTEGER NOT NULL DEFAULT 0;
      `);
      console.log('✅ Added audio_generations_used_this_month column to users table');

      console.log('📊 Adding video_generations_used_this_month column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS video_generations_used_this_month INTEGER NOT NULL DEFAULT 0;
      `);
      console.log('✅ Added video_generations_used_this_month column to users table');

      // Add columns to subscription_plans table
      console.log('📊 Adding max_audio_generations column to subscription_plans table...');
      await client.query(`
        ALTER TABLE subscription_plans 
        ADD COLUMN IF NOT EXISTS max_audio_generations INTEGER NOT NULL DEFAULT 5;
      `);
      console.log('✅ Added max_audio_generations column to subscription_plans table');

      console.log('📊 Adding max_video_generations column to subscription_plans table...');
      await client.query(`
        ALTER TABLE subscription_plans 
        ADD COLUMN IF NOT EXISTS max_video_generations INTEGER NOT NULL DEFAULT 1;
      `);
      console.log('✅ Added max_video_generations column to subscription_plans table');

      // Update existing plans with default values if they don't have them set
      console.log('🔄 Updating existing subscription plans with default values...');
      
      // Update Free plan (if exists) - 5 audio, 1 video
      await client.query(`
        UPDATE subscription_plans 
        SET max_audio_generations = 5, max_video_generations = 1
        WHERE (name ILIKE '%free%' OR name = 'Free') 
        AND (max_audio_generations IS NULL OR max_audio_generations = 0 OR max_audio_generations = 5)
        AND (max_video_generations IS NULL OR max_video_generations = 0 OR max_video_generations = 1);
      `);
      
      // Update Basic plan (if exists) - 30 audio, 5 video
      await client.query(`
        UPDATE subscription_plans 
        SET max_audio_generations = 30, max_video_generations = 5
        WHERE (name ILIKE '%basic%' OR name = 'Basic') 
        AND (max_audio_generations IS NULL OR max_audio_generations = 0 OR max_audio_generations = 5)
        AND (max_video_generations IS NULL OR max_video_generations = 0 OR max_video_generations = 1);
      `);
      
      // Update Premium plan (if exists) - 100 audio, 10 video
      await client.query(`
        UPDATE subscription_plans 
        SET max_audio_generations = 100, max_video_generations = 10
        WHERE (name ILIKE '%premium%' OR name = 'Premium') 
        AND (max_audio_generations IS NULL OR max_audio_generations = 0 OR max_audio_generations = 5)
        AND (max_video_generations IS NULL OR max_video_generations = 0 OR max_video_generations = 1);
      `);
      
      console.log('✅ Updated existing subscription plans with default values');

      // Set default values for any plans that still have NULL values
      await client.query(`
        UPDATE subscription_plans 
        SET max_audio_generations = COALESCE(max_audio_generations, 5),
            max_video_generations = COALESCE(max_video_generations, 1)
        WHERE max_audio_generations IS NULL OR max_video_generations IS NULL;
      `);

      console.log('🎉 Migration completed successfully!');
      console.log('📈 Audio and video generation tracking is now enabled');
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
addAudioVideoGenerationColumns();

export { addAudioVideoGenerationColumns };

