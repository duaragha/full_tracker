-- Add is_replacement column to inventory_items table
-- When true, this child item is a replacement for its parent (neither count toward totals)

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS is_replacement BOOLEAN DEFAULT FALSE;

-- Add index for faster queries filtering by replacement status
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_replacement ON inventory_items(is_replacement);
