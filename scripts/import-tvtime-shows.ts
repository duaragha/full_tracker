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

interface TVTimeEpisode {
  id: {
    tvdb: number
    imdb: string
  }
  number: number
  special: boolean
  is_watched: boolean
  watched_at?: string
}

interface TVTimeSeason {
  number: number
  episodes: TVTimeEpisode[]
}

interface TVTimeShow {
  uuid: string
  id: {
    tvdb: number
    imdb: string
  }
  created_at: string
  title: string
  status: string
  seasons: TVTimeSeason[]
}

interface TMDbFindResponse {
  tv_results: Array<{
    id: number
    name: string
    poster_path: string | null
    backdrop_path: string | null
    first_air_date: string
    overview: string
  }>
}

interface TMDbTVShowDetails {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  last_air_date: string | null
  genres: Array<{ id: number; name: string }>
  networks: Array<{ id: number; name: string }>
  number_of_seasons: number
  number_of_episodes: number
  status: string
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function findTVShowByImdbId(imdbId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
    )

    if (!response.ok) {
      console.error(`Failed to find TV show ${imdbId}: ${response.statusText}`)
      return null
    }

    const data: TMDbFindResponse = await response.json()

    if (data.tv_results && data.tv_results.length > 0) {
      return data.tv_results[0].id
    }

    return null
  } catch (error) {
    console.error(`Error finding TV show ${imdbId}:`, error)
    return null
  }
}

async function getTVShowDetails(tmdbId: number): Promise<TMDbTVShowDetails | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
    )

    if (!response.ok) {
      console.error(`Failed to get TV show details ${tmdbId}: ${response.statusText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Error getting TV show details ${tmdbId}:`, error)
    return null
  }
}

async function showExists(tmdbId: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM tvshows WHERE tmdb_id = $1',
    [tmdbId]
  )
  return result.rows.length > 0
}

function calculateWatchStats(show: TVTimeShow) {
  const watchedEpisodes: Array<{ season: number; episode: number; date: string }> = []

  show.seasons.forEach(season => {
    season.episodes.forEach(episode => {
      if (episode.is_watched && episode.watched_at) {
        watchedEpisodes.push({
          season: season.number,
          episode: episode.number,
          date: episode.watched_at
        })
      }
    })
  })

  // Sort by watch date
  watchedEpisodes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const startedDate = watchedEpisodes.length > 0
    ? watchedEpisodes[0].date.split('T')[0]
    : null

  const lastWatchedEpisode = watchedEpisodes.length > 0
    ? watchedEpisodes[watchedEpisodes.length - 1]
    : null

  // Check if show is completed (all episodes watched)
  const totalEpisodes = show.seasons.reduce((sum, season) =>
    sum + season.episodes.filter(ep => !ep.special).length, 0
  )
  const watchedCount = watchedEpisodes.length
  const isCompleted = totalEpisodes > 0 && watchedCount === totalEpisodes

  const completedDate = isCompleted && lastWatchedEpisode
    ? lastWatchedEpisode.date.split('T')[0]
    : null

  return {
    startedDate,
    completedDate,
    currentSeason: lastWatchedEpisode?.season || 1,
    currentEpisode: lastWatchedEpisode?.episode || 1,
    totalSeasons: Math.max(...show.seasons.map(s => s.number), 0),
    watchedCount,
    totalEpisodes
  }
}

function mapStatus(tvTimeStatus: string, stats: any): string {
  // TV Time statuses: watching, stopped, completed, etc.
  if (stats.completedDate) return 'Completed'
  if (tvTimeStatus === 'watching') return 'Watching'
  if (tvTimeStatus === 'stopped') return 'Dropped'
  if (stats.watchedCount > 0) return 'Watching'
  return 'Plan to Watch'
}

async function importShow(tvTimeShow: TVTimeShow) {
  console.log(`\nProcessing: ${tvTimeShow.title}`)

  // Find TMDB ID using IMDB ID
  const tmdbId = await findTVShowByImdbId(tvTimeShow.id.imdb)

  if (!tmdbId) {
    console.log(`  ❌ Could not find TMDB ID for ${tvTimeShow.title} (${tvTimeShow.id.imdb})`)
    return { success: false, title: tvTimeShow.title, reason: 'TMDB ID not found' }
  }

  // Check if show already exists
  const exists = await showExists(tmdbId)
  if (exists) {
    console.log(`  ⏭️  Already exists: ${tvTimeShow.title} (TMDB: ${tmdbId})`)
    return { success: true, title: tvTimeShow.title, skipped: true }
  }

  // Get show details
  const details = await getTVShowDetails(tmdbId)

  if (!details) {
    console.log(`  ❌ Could not get details for ${tvTimeShow.title} (TMDB: ${tmdbId})`)
    return { success: false, title: tvTimeShow.title, reason: 'Details not found' }
  }

  // Calculate watch statistics
  const stats = calculateWatchStats(tvTimeShow)

  // Prepare data
  const posterImage = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : ''
  const genre = details.genres.map(g => g.name).join(', ')
  const status = mapStatus(tvTimeShow.status, stats)

  // For plan to watch shows, set watchlist_added_date to created_at from TV Time
  const watchlistAddedDate = (status === 'Plan to Watch' && tvTimeShow.created_at)
    ? tvTimeShow.created_at.split('T')[0]
    : null

  // Insert into database
  try {
    await pool.query(
      `INSERT INTO tvshows (
        tmdb_id, title, genre, total_seasons, current_season, current_episode,
        poster_image, started_date, completed_date, watchlist_added_date, status, rating, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      [
        tmdbId,
        details.name,
        genre,
        stats.totalSeasons,
        stats.currentSeason,
        stats.currentEpisode,
        posterImage,
        stats.startedDate,
        stats.completedDate,
        watchlistAddedDate,
        status,
        null, // rating - user can add later
        `Imported from TV Time\nIMDB: ${tvTimeShow.id.imdb}\nWatched ${stats.watchedCount}/${stats.totalEpisodes} episodes\nTV Time Status: ${tvTimeShow.status}`,
      ]
    )

    console.log(`  ✅ Imported: ${details.name} (${stats.watchedCount}/${stats.totalEpisodes} episodes)`)
    return { success: true, title: details.name }
  } catch (error) {
    console.error(`  ❌ Database error for ${tvTimeShow.title}:`, error)
    return { success: false, title: tvTimeShow.title, reason: 'Database error' }
  }
}

async function main() {
  console.log('📺 TV Time Shows Importer\n')
  console.log('=' .repeat(50))

  // Read shows.json
  const showsPath = path.join(process.cwd(), 'shows.json')

  if (!fs.existsSync(showsPath)) {
    console.error('❌ shows.json not found!')
    console.log('Please place shows.json in the project root directory')
    process.exit(1)
  }

  const showsData = fs.readFileSync(showsPath, 'utf-8')
  const shows: TVTimeShow[] = JSON.parse(showsData)

  console.log(`\nFound ${shows.length} TV shows in TV Time export`)

  // Categorize shows by status
  const watching = shows.filter(s => s.status === 'watching')
  const stopped = shows.filter(s => s.status === 'stopped')
  const other = shows.filter(s => s.status !== 'watching' && s.status !== 'stopped')

  console.log(`  - Watching: ${watching.length}`)
  console.log(`  - Stopped: ${stopped.length}`)
  console.log(`  - Other: ${other.length}`)

  console.log('\n' + '='.repeat(50))
  console.log('Starting import...\n')

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as any[]
  }

  // Import all shows
  for (const show of shows) {
    const result = await importShow(show)

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
    await sleep(300)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Import Summary')
  console.log('='.repeat(50))
  console.log(`✅ Successfully imported: ${results.success}`)
  console.log(`⏭️  Skipped (already exists): ${results.skipped}`)
  console.log(`❌ Failed: ${results.failed}`)

  if (results.errors.length > 0) {
    console.log('\n❌ Failed shows:')
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
