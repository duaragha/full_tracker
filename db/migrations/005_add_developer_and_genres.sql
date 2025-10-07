-- Add developer and genres columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS developer TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS genres TEXT[];
