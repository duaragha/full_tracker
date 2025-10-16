import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

async function main() {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tvshows'
    ORDER BY ordinal_position
  `)

  console.log('Current tvshows table columns:')
  console.log('=' .repeat(60))
  result.rows.forEach(row => {
    console.log(`${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${row.is_nullable}`)
  })

  await pool.end()
}

main()
