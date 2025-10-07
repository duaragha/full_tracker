import { Pool } from 'pg'
import { Movie } from '@/types/movie'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

function normalizeMovie(movie: any): Movie {
  return {
    ...movie,
    tmdbId: Number(movie.tmdb_id),
    releaseDate: movie.release_date,
    posterImage: movie.poster_image,
    backdropImage: movie.backdrop_image,
    dateWatched: movie.date_watched instanceof Date ? movie.date_watched.toISOString().split('T')[0] : movie.date_watched,
    runtime: Number(movie.runtime),
    rating: movie.rating ? Number(movie.rating) : null,
    genres: movie.genres || [],
    createdAt: movie.created_at,
    updatedAt: movie.updated_at,
  }
}

export async function getMovies(): Promise<Movie[]> {
  const result = await pool.query<any>(
    'SELECT * FROM movies ORDER BY created_at DESC'
  )
  return result.rows.map(normalizeMovie)
}

export async function addMovie(movie: Omit<Movie, 'id' | 'createdAt' | 'updatedAt'>): Promise<Movie> {
  const result = await pool.query<any>(
    `INSERT INTO movies (
      tmdb_id, title, director, genres, runtime, release_date,
      poster_image, backdrop_image, date_watched, rating, notes,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    RETURNING *`,
    [
      movie.tmdbId,
      movie.title,
      movie.director,
      movie.genres,
      movie.runtime,
      movie.releaseDate,
      movie.posterImage,
      movie.backdropImage,
      movie.dateWatched,
      movie.rating,
      movie.notes,
    ]
  )
  return normalizeMovie(result.rows[0])
}

export async function updateMovie(id: number, movie: Partial<Movie>): Promise<void> {
  await pool.query(
    `UPDATE movies SET
      tmdb_id = COALESCE($1, tmdb_id),
      title = COALESCE($2, title),
      director = COALESCE($3, director),
      genres = COALESCE($4, genres),
      runtime = COALESCE($5, runtime),
      release_date = COALESCE($6, release_date),
      poster_image = COALESCE($7, poster_image),
      backdrop_image = COALESCE($8, backdrop_image),
      date_watched = $9,
      rating = $10,
      notes = COALESCE($11, notes),
      updated_at = NOW()
    WHERE id = $12`,
    [
      movie.tmdbId,
      movie.title,
      movie.director,
      movie.genres,
      movie.runtime,
      movie.releaseDate,
      movie.posterImage,
      movie.backdropImage,
      movie.dateWatched,
      movie.rating,
      movie.notes,
      id,
    ]
  )
}

export async function deleteMovie(id: number): Promise<void> {
  await pool.query('DELETE FROM movies WHERE id = $1', [id])
}

export function calculateTotalRuntime(movies: Movie[]): number {
  return movies.reduce((total, movie) => total + (movie.runtime || 0), 0)
}

export function calculateAverageRating(movies: Movie[]): number {
  const rated = movies.filter(m => m.rating)
  if (rated.length === 0) return 0
  const sum = rated.reduce((total, movie) => total + (movie.rating || 0), 0)
  return Math.round((sum / rated.length) * 10)
}
