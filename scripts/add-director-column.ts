import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

async function main() {
  console.log('🎬 Adding director column and extracting data...\n')

  try {
    // Step 1: Add director column
    console.log('1️⃣  Adding director column...')
    await pool.query(`
      ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS director TEXT
    `)
    console.log('   ✅ Director column added\n')

    // Step 2: Extract director from notes
    console.log('2️⃣  Extracting directors from notes...')
    const movies = await pool.query('SELECT id, notes FROM movies WHERE notes IS NOT NULL')

    let updated = 0
    for (const movie of movies.rows) {
      // Extract director from notes using regex
      const directorMatch = movie.notes.match(/Director: (.+?)(?:\n|$)/)

      if (directorMatch) {
        const director = directorMatch[1].trim()
        await pool.query(
          'UPDATE movies SET director = $1 WHERE id = $2',
          [director, movie.id]
        )
        updated++
      }
    }

    console.log(`   ✅ Extracted directors for ${updated} movies\n`)

    // Step 3: Verify
    console.log('3️⃣  Verification:')
    const sample = await pool.query('SELECT id, title, director FROM movies LIMIT 5')
    console.log(sample.rows)

    await pool.end()
    console.log('\n✨ Complete!')
  } catch (error) {
    console.error('❌ Error:', error)
    await pool.end()
    process.exit(1)
  }
}

main()
