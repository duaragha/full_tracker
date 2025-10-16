import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

const TMDB_API_KEY = '98e6dfd40c55480146fa393e2aad48fe'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

interface TVTimeMovie {
  id: {
    tvdb: number
    imdb: string
  }
  created_at: string
  uuid: string
  title: string
  watched_at?: string
  is_watched: boolean
}

interface TMDbFindResponse {
  movie_results: Array<{
    id: number
    title: string
    poster_path: string | null
    backdrop_path: string | null
    release_date: string
    overview: string
  }>
}

interface TMDbMovieDetails {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  genres: Array<{ id: number; name: string }>
  runtime: number | null
  overview: string
}

interface TMDbCreditsResponse {
  crew: Array<{
    id: number
    name: string
    job: string
    department: string
  }>
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function findMovieByImdbId(imdbId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
    )

    if (!response.ok) {
      console.error(`Failed to find movie ${imdbId}: ${response.statusText}`)
      return null
    }

    const data: TMDbFindResponse = await response.json()

    if (data.movie_results && data.movie_results.length > 0) {
      return data.movie_results[0].id
    }

    return null
  } catch (error) {
    console.error(`Error finding movie ${imdbId}:`, error)
    return null
  }
}

async function getMovieDetails(tmdbId: number): Promise<TMDbMovieDetails | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
    )

    if (!response.ok) {
      console.error(`Failed to get movie details ${tmdbId}: ${response.statusText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Error getting movie details ${tmdbId}:`, error)
    return null
  }
}

async function getMovieCredits(tmdbId: number): Promise<string> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`
    )

    if (!response.ok) {
      return 'Unknown'
    }

    const data: TMDbCreditsResponse = await response.json()
    const director = data.crew.find(person => person.job === 'Director')
    return director ? director.name : 'Unknown'
  } catch (error) {
    return 'Unknown'
  }
}

async function movieExists(tmdbId: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM movies WHERE tmdb_id = $1',
    [tmdbId]
  )
  return result.rows.length > 0
}

async function importMovie(tvTimeMovie: TVTimeMovie) {
  console.log(`\nProcessing: ${tvTimeMovie.title}`)

  // Find TMDB ID using IMDB ID
  const tmdbId = await findMovieByImdbId(tvTimeMovie.id.imdb)

  if (!tmdbId) {
    console.log(`  ❌ Could not find TMDB ID for ${tvTimeMovie.title} (${tvTimeMovie.id.imdb})`)
    return { success: false, title: tvTimeMovie.title, reason: 'TMDB ID not found' }
  }

  // Check if movie already exists
  const exists = await movieExists(tmdbId)
  if (exists) {
    console.log(`  ⏭️  Already exists: ${tvTimeMovie.title} (TMDB: ${tmdbId})`)
    return { success: true, title: tvTimeMovie.title, skipped: true }
  }

  // Get movie details
  const details = await getMovieDetails(tmdbId)

  if (!details) {
    console.log(`  ❌ Could not get details for ${tvTimeMovie.title} (TMDB: ${tmdbId})`)
    return { success: false, title: tvTimeMovie.title, reason: 'Details not found' }
  }

  // Get director
  const director = await getMovieCredits(tmdbId)

  // Prepare data
  const posterImage = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : ''
  const genre = details.genres.map(g => g.name).join(', ')
  const watchedDate = tvTimeMovie.is_watched && tvTimeMovie.watched_at
    ? tvTimeMovie.watched_at.split('T')[0]
    : null
  const releaseDate = details.release_date || null
  const releaseYear = details.release_date
    ? parseInt(details.release_date.substring(0, 4))
    : null
  const status = tvTimeMovie.is_watched ? 'Watched' : 'Watchlist'

  // For watchlist items, set watchlist_added_date to created_at from TV Time
  const watchlistAddedDate = !tvTimeMovie.is_watched && tvTimeMovie.created_at
    ? tvTimeMovie.created_at.split('T')[0]
    : null

  // Insert into database
  try {
    await pool.query(
      `INSERT INTO movies (
        tmdb_id, title, genre, runtime, release_date, release_year, director,
        poster_image, watched_date, watchlist_added_date, status, rating, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      [
        tmdbId,
        details.title,
        genre,
        details.runtime || 0,
        releaseDate,
        releaseYear,
        director,
        posterImage,
        watchedDate,
        watchlistAddedDate,
        status,
        null, // rating - user can add later
        `Imported from TV Time\nIMDB: ${tvTimeMovie.id.imdb}\nOriginal watch date: ${tvTimeMovie.watched_at || 'N/A'}`,
      ]
    )

    console.log(`  ✅ Imported: ${details.title} (${details.release_date?.substring(0, 4) || 'N/A'})`)
    return { success: true, title: details.title }
  } catch (error) {
    console.error(`  ❌ Database error for ${tvTimeMovie.title}:`, error)
    return { success: false, title: tvTimeMovie.title, reason: 'Database error' }
  }
}

async function main() {
  console.log('🎬 TV Time Movies Importer\n')
  console.log('=' .repeat(50))

  // Read movies.json
  const moviesPath = path.join(process.cwd(), 'movies.json')
  const moviesData = fs.readFileSync(moviesPath, 'utf-8')
  const movies: TVTimeMovie[] = JSON.parse(moviesData)

  console.log(`\nFound ${movies.length} movies in TV Time export`)

  // Separate watched and unwatched
  const watchedMovies = movies.filter(m => m.is_watched)
  const unwatchedMovies = movies.filter(m => !m.is_watched)

  console.log(`  - Watched: ${watchedMovies.length}`)
  console.log(`  - Unwatched (watchlist): ${unwatchedMovies.length}`)

  console.log('\n' + '='.repeat(50))
  console.log('Starting import...\n')

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as any[]
  }

  // Import watched movies first
  console.log('\n📺 Importing watched movies...')
  for (const movie of watchedMovies) {
    const result = await importMovie(movie)

    if (result.success) {
      if (result.skipped) {
        results.skipped++
      } else {
        results.success++
      }
    } else {
      results.failed++
      results.errors.push(result)
    }

    // Rate limiting - TMDB allows 40 requests per 10 seconds
    await sleep(250)
  }

  // Import unwatched movies (watchlist)
  console.log('\n📋 Importing watchlist movies...')
  for (const movie of unwatchedMovies) {
    const result = await importMovie(movie)

    if (result.success) {
      if (result.skipped) {
        results.skipped++
      } else {
        results.success++
      }
    } else {
      results.failed++
      results.errors.push(result)
    }

    await sleep(250)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Import Summary')
  console.log('='.repeat(50))
  console.log(`✅ Successfully imported: ${results.success}`)
  console.log(`⏭️  Skipped (already exists): ${results.skipped}`)
  console.log(`❌ Failed: ${results.failed}`)

  if (results.errors.length > 0) {
    console.log('\n❌ Failed movies:')
    results.errors.forEach(err => {
      console.log(`  - ${err.title}: ${err.reason}`)
    })
  }

  await pool.end()
  console.log('\n✨ Import complete!')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
