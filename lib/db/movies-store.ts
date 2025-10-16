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
  // Parse genre string into array (database has comma-separated string)
  const genres = movie.genre
    ? movie.genre.split(',').map((g: string) => g.trim()).filter(Boolean)
    : []

  // Format dates consistently
  const formatDate = (date: any) => {
    if (!date) return null
    if (date instanceof Date) return date.toISOString().split('T')[0]
    if (typeof date === 'string') return date.split('T')[0]
    return null
  }

  return {
    ...movie,
    tmdbId: Number(movie.tmdb_id),
    director: movie.director || 'Unknown',
    genres,
    runtime: Number(movie.runtime) || 0,
    releaseDate: formatDate(movie.release_date),
    releaseYear: movie.release_year ? Number(movie.release_year) : null,
    posterImage: movie.poster_image || '',
    status: movie.status || 'Watchlist',
    dateWatched: formatDate(movie.watched_date),
    watchlistAddedDate: formatDate(movie.watchlist_added_date),
    rating: movie.rating ? Number(movie.rating) : null,
    notes: movie.notes || '',
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
  // Convert genres array to comma-separated string for database
  const genreString = movie.genres.join(', ')

  const result = await pool.query<any>(
    `INSERT INTO movies (
      tmdb_id, title, director, genre, runtime, release_date, release_year,
      poster_image, status, watched_date, watchlist_added_date,
      rating, notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
    RETURNING *`,
    [
      movie.tmdbId,
      movie.title,
      movie.director,
      genreString,
      movie.runtime,
      movie.releaseDate,
      movie.releaseYear,
      movie.posterImage,
      movie.status,
      movie.dateWatched,
      movie.watchlistAddedDate,
      movie.rating,
      movie.notes,
    ]
  )
  return normalizeMovie(result.rows[0])
}

export async function updateMovie(id: number, movie: Partial<Movie>): Promise<void> {
  // Convert genres array to comma-separated string if provided
  const genreString = movie.genres ? movie.genres.join(', ') : undefined

  await pool.query(
    `UPDATE movies SET
      tmdb_id = COALESCE($1, tmdb_id),
      title = COALESCE($2, title),
      director = COALESCE($3, director),
      genre = COALESCE($4, genre),
      runtime = COALESCE($5, runtime),
      release_date = COALESCE($6, release_date),
      release_year = COALESCE($7, release_year),
      poster_image = COALESCE($8, poster_image),
      status = COALESCE($9, status),
      watched_date = $10,
      watchlist_added_date = $11,
      rating = $12,
      notes = COALESCE($13, notes),
      updated_at = NOW()
    WHERE id = $14`,
    [
      movie.tmdbId,
      movie.title,
      movie.director,
      genreString,
      movie.runtime,
      movie.releaseDate,
      movie.releaseYear,
      movie.posterImage,
      movie.status,
      movie.dateWatched,
      movie.watchlistAddedDate,
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
