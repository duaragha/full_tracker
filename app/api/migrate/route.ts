import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

export async function GET() {
  try {
    // Align inventory areas with application fields
    await pool.query(`
      ALTER TABLE inventory_areas
        ADD COLUMN IF NOT EXISTS type TEXT;

      UPDATE inventory_areas
      SET type = COALESCE(type, 'Room');

      ALTER TABLE inventory_areas
        ALTER COLUMN type SET DEFAULT 'Room';
    `)

    // Align inventory containers with application fields
    await pool.query(`
      ALTER TABLE inventory_containers
        ADD COLUMN IF NOT EXISTS type TEXT,
        ADD COLUMN IF NOT EXISTS color TEXT;

      UPDATE inventory_containers
      SET type = COALESCE(type, 'Box');

      UPDATE inventory_containers
      SET color = COALESCE(color, '');

      ALTER TABLE inventory_containers
        ALTER COLUMN type SET DEFAULT 'Box';

      ALTER TABLE inventory_containers
        ALTER COLUMN color SET DEFAULT '';
    `)

    // Run migration 007 - Add all missing inventory columns
    await pool.query(`
      ALTER TABLE inventory_items
        ADD COLUMN IF NOT EXISTS used_in_last_year BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS location JSONB DEFAULT '{"areaId":"","containerId":""}'::jsonb,
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

      UPDATE inventory_items
      SET location = COALESCE(location, '{"areaId":"","containerId":""}'::jsonb);

      UPDATE inventory_items
      SET cost = COALESCE(cost, 0);

      UPDATE inventory_items
      SET used_in_last_year = COALESCE(used_in_last_year, FALSE);

      UPDATE inventory_items
      SET is_gift = COALESCE(is_gift, FALSE);

      UPDATE inventory_items
      SET kept = COALESCE(kept, TRUE);

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'inventory_items'
            AND column_name = 'price'
        ) THEN
          EXECUTE 'UPDATE inventory_items SET cost = COALESCE(cost, price)';
          EXECUTE 'ALTER TABLE inventory_items DROP COLUMN price';
        END IF;
      END $$;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'inventory_items'
            AND column_name = 'gift_recipient'
        ) THEN
          EXECUTE 'UPDATE inventory_items SET gift_from = COALESCE(gift_from, gift_recipient)';
          EXECUTE 'ALTER TABLE inventory_items DROP COLUMN gift_recipient';
        END IF;
      END $$;
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
