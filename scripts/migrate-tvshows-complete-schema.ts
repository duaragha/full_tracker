import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

async function main() {
  console.log('📺 TV Shows Complete Schema Migration\n')
  console.log('=' .repeat(50))

  try {
    // Add network column
    console.log('\n1. Adding network column...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'Unknown'
    `)
    console.log('   ✅ network column added')

    // Convert genre to genres array
    console.log('\n2. Adding genres array column...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}'
    `)
    console.log('   ✅ genres column added')

    // Add backdrop_image
    console.log('\n3. Adding backdrop_image column...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS backdrop_image TEXT DEFAULT ''
    `)
    console.log('   ✅ backdrop_image column added')

    // Add show date columns
    console.log('\n4. Adding show date columns...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS show_start_date DATE,
      ADD COLUMN IF NOT EXISTS show_end_date DATE
    `)
    console.log('   ✅ show_start_date and show_end_date added')

    // Add user watch date columns
    console.log('\n5. Adding user watch date columns...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS date_i_started DATE,
      ADD COLUMN IF NOT EXISTS date_i_ended DATE
    `)
    console.log('   ✅ date_i_started and date_i_ended added')

    // Add episode tracking columns
    console.log('\n6. Adding episode tracking columns...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS total_episodes INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS watched_episodes INTEGER DEFAULT 0
    `)
    console.log('   ✅ total_episodes and watched_episodes added')

    // Add seasons JSON column
    console.log('\n7. Adding seasons column...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS seasons JSONB DEFAULT '[]'::jsonb
    `)
    console.log('   ✅ seasons column added')

    // Add viewing statistics columns
    console.log('\n8. Adding statistics columns...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS days_tracking INTEGER DEFAULT 0
    `)
    console.log('   ✅ total_minutes and days_tracking added')

    // Migrate existing genre data to genres array
    console.log('\n9. Migrating genre to genres array...')
    await pool.query(`
      UPDATE tvshows
      SET genres = string_to_array(genre, ',')
      WHERE genre IS NOT NULL AND genres = '{}'
    `)
    console.log('   ✅ Genre data migrated')

    // Verify the changes
    console.log('\n10. Verifying schema...')
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tvshows'
      ORDER BY column_name
    `)

    console.log('   Complete column list:')
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
