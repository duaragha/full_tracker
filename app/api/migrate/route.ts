import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

export async function GET() {
  try {
    // Run migration 007
    await pool.query(`
      ALTER TABLE inventory_items
        ADD COLUMN IF NOT EXISTS type TEXT,
        ADD COLUMN IF NOT EXISTS area_id INTEGER REFERENCES inventory_areas(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2),
        ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS gift_recipient TEXT,
        ADD COLUMN IF NOT EXISTS purchased_where TEXT,
        ADD COLUMN IF NOT EXISTS purchased_when DATE,
        ADD COLUMN IF NOT EXISTS keep_until DATE;
    `)

    // Run migration 006 (is_gift for games)
    await pool.query(`
      ALTER TABLE games
        ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE;
    `)

    return Response.json({ success: true, message: 'Migrations completed' })
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
