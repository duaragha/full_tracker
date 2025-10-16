const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

const migrationSQL = `
-- Add support for nested items (items within items)
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS parent_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_parent ON inventory_items(parent_item_id);

-- Add check constraint to prevent self-parenting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_not_self_parent'
  ) THEN
    ALTER TABLE inventory_items
      ADD CONSTRAINT check_not_self_parent
      CHECK (parent_item_id IS NULL OR parent_item_id != id);
  END IF;
END $$;
`

async function runMigration() {
  try {
    console.log('Running nested items migration...')
    await pool.query(migrationSQL)
    console.log('✅ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()
