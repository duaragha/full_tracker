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
  return {
    ...game,
    started_date: game.started_date instanceof Date ? game.started_date.toISOString().split('T')[0] : game.started_date,
    completed_date: game.completed_date instanceof Date ? game.completed_date.toISOString().split('T')[0] : game.completed_date,
    hours_played: Number(game.hours_played),
    rating: game.rating ? Number(game.rating) : null,
  }
}

export async function getGames(): Promise<Game[]> {
  const result = await pool.query<Game>(
    'SELECT * FROM games ORDER BY created_at DESC'
  )
  return result.rows.map(normalizeGame)
}

export async function addGame(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> {
  const result = await pool.query<Game>(
    `INSERT INTO games (
      title, platform, status, rating, hours_played, started_date,
      completed_date, notes, genre, cover_image, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    RETURNING *`,
    [
      game.title,
      game.platform,
      game.status,
      game.rating,
      game.hoursPlayed,
      game.startedDate,
      game.completedDate,
      game.notes,
      game.genre,
      game.coverImage,
    ]
  )
  return normalizeGame(result.rows[0])
}

export async function updateGame(id: number, game: Partial<Game>): Promise<void> {
  await pool.query(
    `UPDATE games SET
      title = COALESCE($1, title),
      platform = COALESCE($2, platform),
      status = COALESCE($3, status),
      rating = $4,
      hours_played = COALESCE($5, hours_played),
      started_date = $6,
      completed_date = $7,
      notes = COALESCE($8, notes),
      genre = COALESCE($9, genre),
      cover_image = COALESCE($10, cover_image),
      updated_at = NOW()
    WHERE id = $11`,
    [
      game.title,
      game.platform,
      game.status,
      game.rating,
      game.hoursPlayed,
      game.startedDate,
      game.completedDate,
      game.notes,
      game.genre,
      game.coverImage,
      id,
    ]
  )
}

export async function deleteGame(id: number): Promise<void> {
  await pool.query('DELETE FROM games WHERE id = $1', [id])
}

export function calculateTotalHours(games: Game[]): number {
  return games.reduce((total, game) => total + (game.hoursPlayed || 0), 0)
}

export function calculateTotalDays(games: Game[]): number {
  return games.reduce((total, game) => {
    if (game.startedDate) {
      const start = new Date(game.startedDate)
      const end = game.completedDate ? new Date(game.completedDate) : new Date()
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return total + days
    }
    return total
  }, 0)
}

export function calculateAveragePercentage(games: Game[]): number {
  const rated = games.filter(g => g.rating)
  if (rated.length === 0) return 0
  const sum = rated.reduce((total, game) => total + (game.rating || 0), 0)
  return Math.round((sum / rated.length) * 10)
}
