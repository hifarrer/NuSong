-- Migration script to create track_likes and track_comments tables
-- Run this script directly in PostgreSQL (psql or any PostgreSQL client)

-- Create track_likes table
CREATE TABLE IF NOT EXISTS track_likes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id VARCHAR NOT NULL REFERENCES music_generations(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(track_id, user_id)
);

-- Create track_comments table
CREATE TABLE IF NOT EXISTS track_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id VARCHAR NOT NULL REFERENCES music_generations(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_track_likes_track_id ON track_likes(track_id);
CREATE INDEX IF NOT EXISTS idx_track_likes_user_id ON track_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_track_comments_track_id ON track_comments(track_id);
CREATE INDEX IF NOT EXISTS idx_track_comments_user_id ON track_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_track_comments_created_at ON track_comments(created_at);

-- Verify tables were created
SELECT 
  'track_likes' as table_name,
  COUNT(*) as row_count
FROM track_likes
UNION ALL
SELECT 
  'track_comments' as table_name,
  COUNT(*) as row_count
FROM track_comments;

