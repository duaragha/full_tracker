import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

export async function GET() {
  try {
    const itemsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position;
    `)

    const containersResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'inventory_containers'
      ORDER BY ordinal_position;
    `)

    const areasResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'inventory_areas'
      ORDER BY ordinal_position;
    `)

    return Response.json({
      success: true,
      schema: {
        inventory_items: itemsResult.rows,
        inventory_containers: containersResult.rows,
        inventory_areas: areasResult.rows,
      }
    })
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
