// Copy of import script but only imports first 3 shows for testing
import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

const TMDB_API_KEY = '98e6dfd40c55480146fa393e2aad48fe'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

interface TVTimeEpisode {
  id: { tvdb: number; imdb: string }
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
  id: { tvdb: number; imdb: string }
  created_at: string
  title: string
  status: string
  seasons: TVTimeSeason[]
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
  created_by: Array<{ id: number; name: string }>
  number_of_seasons: number
  number_of_episodes: number
  status: string
}

interface TMDbSeasonDetails {
  season_number: number
  name: string
  episodes: Array<{
    episode_number: number
    name: string
    air_date: string
    runtime: number | null
  }>
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function findTVShowByImdbId(imdbId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
    )
    if (!response.ok) return null
    const data: any = await response.json()
    if (data.tv_results && data.tv_results.length > 0) {
      return data.tv_results[0].id
    }
    return null
  } catch (error) {
    return null
  }
}

async function findTVShowByTVDBId(tvdbId: number): Promise<number | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/find/${tvdbId}?api_key=${TMDB_API_KEY}&external_source=tvdb_id`
    )
    if (!response.ok) return null
    const data: any = await response.json()
    if (data.tv_results && data.tv_results.length > 0) {
      return data.tv_results[0].id
    }
    return null
  } catch (error) {
    return null
  }
}

async function getTVShowDetails(tmdbId: number): Promise<TMDbTVShowDetails | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
    )
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    return null
  }
}

async function getSeasonDetails(tmdbId: number, seasonNumber: number): Promise<TMDbSeasonDetails | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
    )
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
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

  watchedEpisodes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const startedDate = watchedEpisodes.length > 0
    ? watchedEpisodes[0].date.split('T')[0]
    : null

  const lastWatchedEpisode = watchedEpisodes.length > 0
    ? watchedEpisodes[watchedEpisodes.length - 1]
    : null

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

async function importShow(tvTimeShow: TVTimeShow) {
  console.log(`\nProcessing: ${tvTimeShow.title}`)

  let tmdbId = null

  if (tvTimeShow.id.imdb && tvTimeShow.id.imdb !== '-1') {
    tmdbId = await findTVShowByImdbId(tvTimeShow.id.imdb)
  }

  if (!tmdbId && tvTimeShow.id.tvdb) {
    tmdbId = await findTVShowByTVDBId(tvTimeShow.id.tvdb)
  }

  if (!tmdbId) {
    console.log(`  ❌ Could not find TMDB ID`)
    return { success: false, title: tvTimeShow.title, reason: 'TMDB ID not found' }
  }

  const exists = await showExists(tmdbId)
  if (exists) {
    console.log(`  ⏭️  Already exists (TMDB: ${tmdbId})`)
    return { success: true, title: tvTimeShow.title, skipped: true }
  }

  const details = await getTVShowDetails(tmdbId)
  if (!details) {
    console.log(`  ❌ Could not get details`)
    return { success: false, title: tvTimeShow.title, reason: 'Details not found' }
  }

  const stats = calculateWatchStats(tvTimeShow)
  const creators = details.created_by?.map(c => c.name) || []
  const network = details.networks?.length > 0 ? details.networks[0].name : 'Unknown'

  const posterImage = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : ''
  const backdropImage = details.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
    : ''
  const genres = details.genres?.map(g => g.name) || []

  console.log(`  📺 ${details.name}`)
  console.log(`     Creators: ${creators.join(', ') || 'None'}`)
  console.log(`     Network: ${network}`)
  console.log(`     Aired: ${details.first_air_date || 'Unknown'}`)

  // Build seasons (limit to first 2 seasons for test)
  const seasonsToImport = tvTimeShow.seasons.slice(0, 2)
  const seasonsData = await Promise.all(
    seasonsToImport.map(async (tvTimeSeason) => {
      const seasonDetails = await getSeasonDetails(details.id, tvTimeSeason.number)
      await sleep(200) // Small delay between season requests

      const episodes = tvTimeSeason.episodes.map(tvTimeEpisode => {
        const tmdbEpisode = seasonDetails?.episodes.find(e => e.episode_number === tvTimeEpisode.number)
        return {
          episodeNumber: tvTimeEpisode.number,
          name: tmdbEpisode?.name || `Episode ${tvTimeEpisode.number}`,
          runtime: tmdbEpisode?.runtime || 0,
          airDate: tmdbEpisode?.air_date || '',
          watched: tvTimeEpisode.is_watched,
          dateWatched: tvTimeEpisode.watched_at ? tvTimeEpisode.watched_at.split('T')[0] : null
        }
      })

      return {
        seasonNumber: tvTimeSeason.number,
        name: seasonDetails?.name || `Season ${tvTimeSeason.number}`,
        episodes
      }
    })
  )

  const totalMinutes = seasonsData.reduce((total, season) => {
    return total + season.episodes
      .filter(ep => ep.watched)
      .reduce((sum, ep) => sum + (ep.runtime || 0), 0)
  }, 0)

  let daysTracking = 0
  if (stats.startedDate && stats.completedDate) {
    const start = new Date(stats.startedDate)
    const end = new Date(stats.completedDate)
    daysTracking = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  } else if (stats.startedDate) {
    const start = new Date(stats.startedDate)
    const now = new Date()
    daysTracking = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  try {
    await pool.query(
      `INSERT INTO tvshows (
        tmdb_id, title, creators, network, genres, poster_image, backdrop_image,
        show_start_date, show_end_date, date_i_started, date_i_ended,
        total_episodes, watched_episodes, seasons, total_minutes, days_tracking,
        rewatch_count, rewatch_history, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())`,
      [
        tmdbId,
        details.name,
        creators,
        network,
        genres,
        posterImage,
        backdropImage,
        details.first_air_date || null,
        details.last_air_date || null,
        stats.startedDate,
        stats.completedDate,
        stats.totalEpisodes,
        stats.watchedCount,
        JSON.stringify(seasonsData),
        totalMinutes,
        daysTracking,
        0,
        JSON.stringify([]),
        `Imported from TV Time`,
      ]
    )

    console.log(`  ✅ Imported (${stats.watchedCount}/${stats.totalEpisodes} eps, ${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m)`)
    return { success: true, title: details.name }
  } catch (error) {
    console.error(`  ❌ Database error:`, error)
    return { success: false, title: tvTimeShow.title, reason: 'Database error' }
  }
}

async function main() {
  console.log('📺 Test Import - First 3 Shows\n')

  const showsData = fs.readFileSync('shows.json', 'utf-8')
  const shows: TVTimeShow[] = JSON.parse(showsData)

  console.log(`Found ${shows.length} shows, importing first 3...\n`)

  const results = { success: 0, failed: 0, skipped: 0, errors: [] as any[] }

  for (const show of shows.slice(0, 3)) {
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

    await sleep(500)
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Success: ${results.success}`)
  console.log(`⏭️  Skipped: ${results.skipped}`)
  console.log(`❌ Failed: ${results.failed}`)

  await pool.end()
}

main().catch(console.error)
