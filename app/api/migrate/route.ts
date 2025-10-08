import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

export async function GET() {
  try {
    // Run migration 007 - Add all missing inventory columns
    await pool.query(`
      ALTER TABLE inventory_items
        ADD COLUMN IF NOT EXISTS used_in_last_year BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS location JSONB,
        ADD COLUMN IF NOT EXISTS type TEXT,
        ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS gift_from TEXT,
        ADD COLUMN IF NOT EXISTS purchased_where TEXT,
        ADD COLUMN IF NOT EXISTS purchased_when DATE,
        ADD COLUMN IF NOT EXISTS keep_until DATE,
        ADD COLUMN IF NOT EXISTS kept BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS sold_date DATE,
        ADD COLUMN IF NOT EXISTS sold_price NUMERIC(10, 2),
        ADD COLUMN IF NOT EXISTS photo TEXT;
    `)

    // Update existing rows to have default location if null
    await pool.query(`
      UPDATE inventory_items
      SET location = '{"areaId":"","containerId":""}'
      WHERE location IS NULL;
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
