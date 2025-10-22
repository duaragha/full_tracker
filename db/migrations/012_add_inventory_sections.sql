-- Add sections table - a layer between containers and items
CREATE TABLE IF NOT EXISTS inventory_sections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  container_id INTEGER NOT NULL REFERENCES inventory_containers(id) ON DELETE CASCADE,
  type TEXT, -- Drawer, Shelf, Compartment, Pocket, Tray, etc.
  position TEXT, -- Top, Middle, Bottom, Left, Right, Front, Back, etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add section_id to inventory_items
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES inventory_sections(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_sections_container_id ON inventory_sections(container_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_section_id ON inventory_items(section_id);

-- Update location JSONB to include sectionId
-- Note: Existing items will have null section_id, which is fine
