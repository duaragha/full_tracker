import { Pool } from 'pg'
import { Game } from '@/types/game'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

function normalizeGame(game: any): Game {
  const hoursPlayed = Number(game.hours_played || 0)
  const minutesPlayed = Number(game.minutes_played || 0)
  const totalHours = hoursPlayed + minutesPlayed / 60
  const price = Number(game.price || 0)
  const pricePerHour = price > 0 ? totalHours / price : 0

  return {
    id: String(game.id),
    title: game.title || '',
    developer: game.developer || '',
    publisher: game.publisher || '',
    genres: game.genres || [],
    releaseDate: game.release_date || '',
    coverImage: game.cover_image || '',
    status: game.status || 'Playing',
    percentage: Number(game.percentage || 0),
    dateStarted: game.started_date instanceof Date ? game.started_date.toISOString().split('T')[0] : game.started_date,
    dateCompleted: game.completed_date instanceof Date ? game.completed_date.toISOString().split('T')[0] : game.completed_date,
    daysPlayed: Number(game.days_played || 0),
    hoursPlayed,
    minutesPlayed,
    console: game.platform || game.console || '',
    store: game.store || '',
    price,
    pricePerHour,
    isGift: Boolean(game.is_gift || false),
    notes: game.notes || '',
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  }
}

export async function getGames(): Promise<Game[]> {
  const result = await pool.query<any>(
    `SELECT
      id, title, developer, publisher, genres, release_date, cover_image, status, percentage,
      started_date, completed_date, hours_played, minutes_played, platform, console,
      store, price, is_gift, notes, created_at, updated_at,
      CASE
        WHEN started_date IS NOT NULL AND completed_date IS NOT NULL THEN
          (completed_date::date - started_date::date) + 1
        WHEN started_date IS NOT NULL THEN
          (CURRENT_DATE - started_date::date) + 1
        ELSE 0
      END as days_played
    FROM games
    ORDER BY created_at DESC`
  )
  return result.rows.map(normalizeGame)
}

export async function addGame(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> {
  const result = await pool.query<any>(
    `INSERT INTO games (
      title, developer, publisher, genres, release_date, cover_image, status, percentage,
      started_date, completed_date, days_played, hours_played, minutes_played,
      platform, console, store, price, is_gift, notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
    RETURNING *`,
    [
      game.title,
      game.developer,
      game.publisher,
      game.genres,
      game.releaseDate,
      game.coverImage,
      game.status,
      game.percentage,
      game.dateStarted,
      game.dateCompleted,
      game.daysPlayed,
      game.hoursPlayed,
      game.minutesPlayed,
      game.console,
      game.console,
      game.store,
      game.price,
      game.isGift || false,
      game.notes,
    ]
  )
  return normalizeGame(result.rows[0])
}

export async function updateGame(id: number, game: Partial<Game>): Promise<void> {
  await pool.query(
    `UPDATE games SET
      title = COALESCE($1, title),
      developer = COALESCE($2, developer),
      publisher = COALESCE($3, publisher),
      genres = COALESCE($4, genres),
      release_date = COALESCE($5, release_date),
      cover_image = COALESCE($6, cover_image),
      status = COALESCE($7, status),
      percentage = COALESCE($8, percentage),
      started_date = $9,
      completed_date = $10,
      days_played = COALESCE($11, days_played),
      hours_played = COALESCE($12, hours_played),
      minutes_played = COALESCE($13, minutes_played),
      console = COALESCE($14, console),
      platform = COALESCE($14, platform),
      store = COALESCE($15, store),
      price = COALESCE($16, price),
      is_gift = COALESCE($17, is_gift),
      notes = COALESCE($18, notes),
      updated_at = NOW()
    WHERE id = $19`,
    [
      game.title,
      game.developer,
      game.publisher,
      game.genres,
      game.releaseDate,
      game.coverImage,
      game.status,
      game.percentage,
      game.dateStarted,
      game.dateCompleted,
      game.daysPlayed,
      game.hoursPlayed,
      game.minutesPlayed,
      game.console,
      game.store,
      game.price,
      game.isGift,
      game.notes,
      id,
    ]
  )
}

export async function deleteGame(id: number): Promise<void> {
  await pool.query('DELETE FROM games WHERE id = $1', [id])
}

export function calculateTotalHours(games: Game[]): number {
  return games
    .filter(game => game.status !== 'Stopped')
    .reduce((total, game) => total + (game.hoursPlayed || 0) + (game.minutesPlayed || 0) / 60, 0)
}

export function calculateTotalDays(games: Game[]): number {
  return games
    .filter(game => game.status !== 'Stopped')
    .reduce((total, game) => total + (game.daysPlayed || 0), 0)
}

export function calculateAveragePercentage(games: Game[]): number {
  const activeGames = games.filter(game => game.status !== 'Stopped')
  if (activeGames.length === 0) return 0
  const sum = activeGames.reduce((total, game) => total + (game.percentage || 0), 0)
  return Math.round(sum / activeGames.length)
}
