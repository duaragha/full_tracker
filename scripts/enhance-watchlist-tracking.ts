import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

async function main() {
  console.log('📋 Enhancing Watchlist Tracking System...\n')
  console.log('=' .repeat(50))

  try {
    // ========================================
    // MOVIES TABLE
    // ========================================
    console.log('\n🎬 MOVIES TABLE\n')

    // Step 1: Add watchlist_added_date column to movies
    console.log('1️⃣  Adding watchlist_added_date column...')
    await pool.query(`
      ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS watchlist_added_date DATE
    `)
    console.log('   ✅ Column added\n')

    // Step 2: Populate for existing watchlist movies
    console.log('2️⃣  Populating watchlist dates for existing movies...')
    const watchlistMovies = await pool.query(`
      SELECT id, created_at, notes
      FROM movies
      WHERE status = 'Watchlist'
    `)

    for (const movie of watchlistMovies.rows) {
      // Try to extract original TV Time created date from notes
      const createdMatch = movie.notes?.match(/Original watch date: (.+?)(?:\n|$)/)
      let watchlistDate = movie.created_at

      if (createdMatch && createdMatch[1] !== 'N/A') {
        watchlistDate = new Date(createdMatch[1])
      }

      await pool.query(
        'UPDATE movies SET watchlist_added_date = $1 WHERE id = $2',
        [watchlistDate, movie.id]
      )
    }

    console.log(`   ✅ Updated ${watchlistMovies.rows.length} watchlist movies\n`)

    // Step 3: Verify movies
    console.log('3️⃣  Verification (sample watchlist movies):')
    const sampleMovies = await pool.query(`
      SELECT id, title, status, watchlist_added_date
      FROM movies
      WHERE status = 'Watchlist'
      LIMIT 5
    `)
    console.log(sampleMovies.rows)

    // ========================================
    // TV SHOWS TABLE
    // ========================================
    console.log('\n\n📺 TV SHOWS TABLE\n')

    // Step 1: Add watchlist_added_date column to tvshows
    console.log('1️⃣  Adding watchlist_added_date column...')
    await pool.query(`
      ALTER TABLE tvshows
      ADD COLUMN IF NOT EXISTS watchlist_added_date DATE
    `)
    console.log('   ✅ Column added\n')

    // Step 2: Populate for existing plan to watch shows (when shows are imported)
    console.log('2️⃣  Checking for existing plan to watch shows...')
    const planToWatchShows = await pool.query(`
      SELECT id, created_at
      FROM tvshows
      WHERE status = 'Plan to Watch'
    `)

    for (const show of planToWatchShows.rows) {
      await pool.query(
        'UPDATE tvshows SET watchlist_added_date = $1 WHERE id = $2',
        [show.created_at, show.id]
      )
    }

    console.log(`   ✅ Updated ${planToWatchShows.rows.length} plan to watch shows\n`)

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(50))
    console.log('📊 Summary\n')

    const movieStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'Watched') as watched,
        COUNT(*) FILTER (WHERE status = 'Watchlist') as watchlist
      FROM movies
    `)

    const showStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'Watching') as watching,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed,
        COUNT(*) FILTER (WHERE status = 'Plan to Watch') as plan_to_watch,
        COUNT(*) FILTER (WHERE status = 'Dropped') as dropped
      FROM tvshows
    `)

    console.log('Movies:')
    console.log(`  - Watched: ${movieStats.rows[0].watched}`)
    console.log(`  - Watchlist: ${movieStats.rows[0].watchlist}`)

    console.log('\nTV Shows:')
    console.log(`  - Watching: ${showStats.rows[0].watching}`)
    console.log(`  - Completed: ${showStats.rows[0].completed}`)
    console.log(`  - Plan to Watch: ${showStats.rows[0].plan_to_watch}`)
    console.log(`  - Dropped: ${showStats.rows[0].dropped}`)

    console.log('\n✨ Watchlist tracking enhanced successfully!')
    console.log('\n💡 Benefits:')
    console.log('   • Simple status-based filtering (status = "Watchlist")')
    console.log('   • Track how long items have been on your list')
    console.log('   • Sort by oldest/newest additions')
    console.log('   • Identify forgotten watchlist items')

    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error)
    await pool.end()
    process.exit(1)
  }
}

main()
