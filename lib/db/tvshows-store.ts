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
    tmdbId: Number(show.tmdb_id),
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
    seasons: show.seasons || [],
    genres: show.genres || [],
    createdAt: show.created_at,
    updatedAt: show.updated_at,
  }
}

export async function getTVShows(): Promise<TVShow[]> {
  const result = await pool.query<any>(
    'SELECT * FROM tvshows ORDER BY created_at DESC'
  )
  return result.rows.map(normalizeTVShow)
}

export async function addTVShow(show: Omit<TVShow, 'id' | 'createdAt' | 'updatedAt'>): Promise<TVShow> {
  const result = await pool.query<any>(
    `INSERT INTO tvshows (
      tmdb_id, title, network, genres, poster_image, backdrop_image,
      show_start_date, show_end_date, date_i_started, date_i_ended,
      total_episodes, watched_episodes, seasons, total_minutes,
      days_tracking, notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
    RETURNING *`,
    [
      show.tmdbId,
      show.title,
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
      show.seasons,
      show.totalMinutes,
      show.daysTracking,
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
      network = COALESCE($3, network),
      genres = COALESCE($4, genres),
      poster_image = COALESCE($5, poster_image),
      backdrop_image = COALESCE($6, backdrop_image),
      show_start_date = COALESCE($7, show_start_date),
      show_end_date = $8,
      date_i_started = $9,
      date_i_ended = $10,
      total_episodes = COALESCE($11, total_episodes),
      watched_episodes = COALESCE($12, watched_episodes),
      seasons = COALESCE($13, seasons),
      total_minutes = COALESCE($14, total_minutes),
      days_tracking = COALESCE($15, days_tracking),
      notes = COALESCE($16, notes),
      updated_at = NOW()
    WHERE id = $17`,
    [
      show.tmdbId,
      show.title,
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
      show.seasons,
      show.totalMinutes,
      show.daysTracking,
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
