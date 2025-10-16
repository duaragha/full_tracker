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

async function findTVShowByTVDBId(tvdbId: number): Promise<number | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/find/tvdb-${tvdbId}?api_key=${TMDB_API_KEY}&external_source=tvdb_id`
    )

    if (!response.ok) {
      return null
    }

    const data: any = await response.json()

    if (data.tv_results && data.tv_results.length > 0) {
      return data.tv_results[0].id
    }

    return null
  } catch (error) {
    return null
  }
}

async function getTVShowDetails(tmdbId: number) {
  const response = await fetch(
    `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
  )
  return await response.json()
}

async function getSeasonDetails(tmdbId: number, seasonNumber: number) {
  const response = await fetch(
    `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
  )
  if (!response.ok) return null
  return await response.json()
}

async function testImport() {
  console.log('📺 Test Import - One Show\n')

  const showsData = fs.readFileSync('shows.json', 'utf-8')
  const shows: TVTimeShow[] = JSON.parse(showsData)

  // Get a show with watched episodes
  const testShow = shows.find(s =>
    s.seasons.some(season =>
      season.episodes.some(ep => ep.is_watched)
    )
  )

  if (!testShow) {
    console.log('No shows with watched episodes found')
    return
  }

  console.log(`Testing with: ${testShow.title}`)
  console.log(`TVDB ID: ${testShow.id.tvdb}`)

  // Find TMDB ID
  const tmdbId = await findTVShowByTVDBId(testShow.id.tvdb)
  console.log(`TMDB ID: ${tmdbId}`)

  if (!tmdbId) {
    console.log('Could not find TMDB ID')
    return
  }

  // Get details
  const details = await getTVShowDetails(tmdbId)
  console.log(`\nShow: ${details.name}`)
  console.log(`Creators: ${details.created_by?.map((c: any) => c.name).join(', ') || 'None'}`)
  console.log(`Network: ${details.networks?.[0]?.name || 'Unknown'}`)
  console.log(`First air: ${details.first_air_date}`)
  console.log(`Last air: ${details.last_air_date || 'Ongoing'}`)

  // Get season 1 details
  if (testShow.seasons.length > 0) {
    const seasonDetails = await getSeasonDetails(tmdbId, 1)
    if (seasonDetails) {
      console.log(`\nSeason 1 - ${seasonDetails.name}`)
      console.log(`Episodes: ${seasonDetails.episodes.length}`)
      if (seasonDetails.episodes.length > 0) {
        const ep = seasonDetails.episodes[0]
        console.log(`First episode: ${ep.name}`)
        console.log(`Air date: ${ep.air_date}`)
        console.log(`Runtime: ${ep.runtime} min`)
      }
    }

    // Check TV Time watched data
    const watchedEps = testShow.seasons[0].episodes.filter(e => e.is_watched)
    console.log(`\nTV Time data:`)
    console.log(`Watched episodes in S1: ${watchedEps.length}`)
    if (watchedEps.length > 0) {
      console.log(`First watched: ${watchedEps[0].watched_at}`)
    }
  }

  await pool.end()
}

testImport().catch(console.error)
