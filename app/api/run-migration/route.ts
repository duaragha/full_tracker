import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

export async function GET() {
  try {
    const migrationSQL = `
      ALTER TABLE inventory_items
        ADD COLUMN IF NOT EXISTS parent_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_inventory_items_parent ON inventory_items(parent_item_id);
      
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
    
    await pool.query(migrationSQL)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully!' 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
