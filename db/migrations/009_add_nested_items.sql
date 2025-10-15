-- Add support for nested items (items within items)
-- This allows tracking hierarchical structures like a PC and its components

-- Add parent_item_id to support item hierarchy
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS parent_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE;

-- Add index for better query performance when fetching child items
CREATE INDEX IF NOT EXISTS idx_inventory_items_parent ON inventory_items(parent_item_id);

-- Add a check constraint to prevent items from being their own parent
ALTER TABLE inventory_items
  ADD CONSTRAINT check_not_self_parent
  CHECK (parent_item_id IS NULL OR parent_item_id != id);

-- Optional: Add a comment to document the column
COMMENT ON COLUMN inventory_items.parent_item_id IS 'References parent item for nested item structures (e.g., PC components within a PC)';
