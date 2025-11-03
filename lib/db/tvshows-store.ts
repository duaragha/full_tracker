import { Pool } from 'pg'
import { TVShow } from '@/types/tvshow'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

function normalizeTVShow(show: any): TVShow {
  return {
    ...show,
    id: String(show.id),
    tmdbId: Number(show.tmdb_id),
    creators: show.creators || [],
    posterImage: show.poster_image,
    backdropImage: show.backdrop_image,
    showStartDate: show.show_start_date,
    showEndDate: show.show_end_date,
    dateIStarted: show.date_i_started instanceof Date ? show.date_i_started.toISOString().split('T')[0] : show.date_i_started,
    dateIEnded: show.date_i_ended instanceof Date ? show.date_i_ended.toISOString().split('T')[0] : show.date_i_ended,
    totalEpisodes: Number(show.total_episodes),
    watchedEpisodes: Number(show.watched_episodes),
    totalMinutes: Number(show.total_minutes),
    daysTracking: Number(show.days_tracking),
    rewatchCount: Number(show.rewatch_count) || 0,
    rewatchHistory: show.rewatch_history || [],
    seasons: show.seasons || [],
    genres: show.genres || [],
    createdAt: show.created_at,
    updatedAt: show.updated_at,
  }
}

export async function getTVShows(): Promise<TVShow[]> {
  const result = await pool.query<any>(
    `SELECT
      id, tmdb_id, title, status, creators, network, genres, poster_image, backdrop_image,
      show_start_date, show_end_date, date_i_started, date_i_ended,
      total_episodes, watched_episodes, seasons, total_minutes,
      rewatch_count, rewatch_history, notes, created_at, updated_at,
      CASE
        WHEN date_i_started IS NOT NULL AND date_i_ended IS NOT NULL THEN
          (date_i_ended::date - date_i_started::date) + 1
        WHEN date_i_started IS NOT NULL THEN
          (CURRENT_DATE - date_i_started::date) + 1
        ELSE 0
      END as days_tracking
    FROM tvshows
    ORDER BY created_at DESC`
  )
  return result.rows.map(normalizeTVShow)
}

export async function addTVShow(show: Omit<TVShow, 'id' | 'createdAt' | 'updatedAt'>): Promise<TVShow> {
  const result = await pool.query<any>(
    `INSERT INTO tvshows (
      tmdb_id, title, status, creators, network, genres, poster_image, backdrop_image,
      show_start_date, show_end_date, date_i_started, date_i_ended,
      total_episodes, watched_episodes, seasons, total_minutes,
      days_tracking, rewatch_count, rewatch_history, notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
    RETURNING *`,
    [
      show.tmdbId,
      show.title,
      show.status || 'Plan to Watch',
      show.creators,
      show.network,
      show.genres,
      show.posterImage,
      show.backdropImage,
      show.showStartDate,
      show.showEndDate,
      show.dateIStarted,
      show.dateIEnded,
      show.totalEpisodes,
      show.watchedEpisodes,
      JSON.stringify(show.seasons),
      show.totalMinutes,
      show.daysTracking,
      show.rewatchCount,
      JSON.stringify(show.rewatchHistory),
      show.notes,
    ]
  )
  return normalizeTVShow(result.rows[0])
}

export async function updateTVShow(id: number, show: Partial<TVShow>): Promise<void> {
  await pool.query(
    `UPDATE tvshows SET
      tmdb_id = COALESCE($1, tmdb_id),
      title = COALESCE($2, title),
      status = COALESCE($3, status),
      creators = COALESCE($4, creators),
      network = COALESCE($5, network),
      genres = COALESCE($6, genres),
      poster_image = COALESCE($7, poster_image),
      backdrop_image = COALESCE($8, backdrop_image),
      show_start_date = COALESCE($9, show_start_date),
      show_end_date = $10,
      date_i_started = $11,
      date_i_ended = $12,
      total_episodes = COALESCE($13, total_episodes),
      watched_episodes = COALESCE($14, watched_episodes),
      seasons = COALESCE($15, seasons),
      total_minutes = COALESCE($16, total_minutes),
      days_tracking = COALESCE($17, days_tracking),
      rewatch_count = COALESCE($18, rewatch_count),
      rewatch_history = COALESCE($19, rewatch_history),
      notes = COALESCE($20, notes),
      updated_at = NOW()
    WHERE id = $21`,
    [
      show.tmdbId,
      show.title,
      show.status,
      show.creators,
      show.network,
      show.genres,
      show.posterImage,
      show.backdropImage,
      show.showStartDate,
      show.showEndDate,
      show.dateIStarted,
      show.dateIEnded,
      show.totalEpisodes,
      show.watchedEpisodes,
      show.seasons ? JSON.stringify(show.seasons) : undefined,
      show.totalMinutes,
      show.daysTracking,
      show.rewatchCount,
      show.rewatchHistory ? JSON.stringify(show.rewatchHistory) : undefined,
      show.notes,
      id,
    ]
  )
}

export async function deleteTVShow(id: number): Promise<void> {
  await pool.query('DELETE FROM tvshows WHERE id = $1', [id])
}

export function calculateTotalMinutes(shows: TVShow[]): number {
  return shows.reduce((total, show) => total + (show.totalMinutes || 0), 0)
}

export function calculateTotalDays(shows: TVShow[]): number {
  return shows.reduce((total, show) => total + (show.daysTracking || 0), 0)
}

export function calculateTotalEpisodes(shows: TVShow[]): number {
  return shows.reduce((total, show) => total + (show.watchedEpisodes || 0), 0)
}

export async function markEpisodeWatched(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
  watched: boolean,
  dateWatched?: string
): Promise<void> {
  // Get the show
  const result = await pool.query<any>(
    'SELECT * FROM tvshows WHERE id = $1',
    [showId]
  )

  if (result.rows.length === 0) return

  const show = normalizeTVShow(result.rows[0])

  // Find and update the episode
  const season = show.seasons.find((s) => s.seasonNumber === seasonNumber)
  if (!season) return

  const episode = season.episodes.find((e) => e.episodeNumber === episodeNumber)
  if (!episode) return

  episode.watched = watched
  episode.dateWatched = watched ? (dateWatched || new Date().toISOString()) : null

  // Recalculate totals
  const watchedEpisodes = show.seasons.reduce(
    (total, s) => total + s.episodes.filter((e) => e.watched).length,
    0
  )

  const totalMinutes = show.seasons.reduce(
    (total, s) =>
      total +
      s.episodes
        .filter((e) => e.watched)
        .reduce((sum, e) => sum + (e.runtime || 0), 0),
    0
  )

  // Update days tracking if all episodes are watched
  let dateIEnded = show.dateIEnded
  if (watchedEpisodes === show.totalEpisodes && !dateIEnded) {
    dateIEnded = new Date().toISOString().split('T')[0]
  }

  // Recalculate days tracking
  let daysTracking = 0
  if (show.dateIStarted && dateIEnded) {
    const start = new Date(show.dateIStarted)
    const end = new Date(dateIEnded)
    daysTracking = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  } else if (show.dateIStarted) {
    const start = new Date(show.dateIStarted)
    const now = new Date()
    daysTracking = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Update the show in the database
  await pool.query(
    `UPDATE tvshows SET
      seasons = $1::jsonb,
      watched_episodes = $2,
      total_minutes = $3,
      date_i_ended = $4,
      days_tracking = $5,
      updated_at = NOW()
    WHERE id = $6`,
    [
      JSON.stringify(show.seasons),
      watchedEpisodes,
      totalMinutes,
      dateIEnded,
      daysTracking,
      showId,
    ]
  )
}
