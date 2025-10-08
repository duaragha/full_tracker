-- Add is_gift column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT false;
