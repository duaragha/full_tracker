import { Pool } from 'pg'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

async function main() {
  console.log('📺 TV Shows Migration: Adding creators and rewatch fields\n')
  console.log('=' .repeat(50))

  try {
    // Add creators column (text array)
    console.log('\n1. Adding creators column...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS creators TEXT[] DEFAULT '{}'
    `)
    console.log('   ✅ creators column added')

    // Add rewatch_count column
    console.log('\n2. Adding rewatch_count column...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS rewatch_count INTEGER DEFAULT 0
    `)
    console.log('   ✅ rewatch_count column added')

    // Add rewatch_history column (JSONB array)
    console.log('\n3. Adding rewatch_history column...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS rewatch_history JSONB DEFAULT '[]'::jsonb
    `)
    console.log('   ✅ rewatch_history column added')

    // Verify the changes
    console.log('\n4. Verifying columns...')
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tvshows'
      AND column_name IN ('creators', 'rewatch_count', 'rewatch_history')
      ORDER BY column_name
    `)

    console.log('   Columns created:')
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`)
    })

    console.log('\n' + '='.repeat(50))
    console.log('✨ Migration complete!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
