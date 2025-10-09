-- Add tracking fields to inventory_containers table
ALTER TABLE inventory_containers
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS material TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS capacity TEXT,
  ADD COLUMN IF NOT EXISTS purchased_date DATE,
  ADD COLUMN IF NOT EXISTS purchased_from TEXT,
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_owned BOOLEAN DEFAULT TRUE;

-- Set default values for existing containers
UPDATE inventory_containers
SET is_owned = TRUE
WHERE is_owned IS NULL;