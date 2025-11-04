-- Migration: Add MUX columns to music_generations table
-- Run this SQL script directly in your PostgreSQL database

-- Add mux_asset_id column
ALTER TABLE music_generations 
ADD COLUMN IF NOT EXISTS mux_asset_id VARCHAR;

-- Add mux_playback_id column
ALTER TABLE music_generations 
ADD COLUMN IF NOT EXISTS mux_playback_id VARCHAR;

-- Add mux_asset_status column
ALTER TABLE music_generations 
ADD COLUMN IF NOT EXISTS mux_asset_status VARCHAR;

-- Add comments for documentation
COMMENT ON COLUMN music_generations.mux_asset_id IS 'MUX asset ID for video streaming';
COMMENT ON COLUMN music_generations.mux_playback_id IS 'MUX playback ID for HLS streaming';
COMMENT ON COLUMN music_generations.mux_asset_status IS 'MUX asset processing status: preparing, ready, or errored';

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'music_generations' 
  AND column_name IN ('mux_asset_id', 'mux_playback_id', 'mux_asset_status')
ORDER BY column_name;

