import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

interface MarkWatchedResult {
  success: boolean;
  alreadyWatched?: boolean;
  error?: string;
}

export class PlexMovieService {
  /**
   * Mark movie as watched
   */
  static async markMovieWatched(movieId: number): Promise<MarkWatchedResult> {
    try {
      // Check if movie exists and get current status
      const movieResult = await pool.query(
        'SELECT id, status, watched_date FROM movies WHERE id = $1',
        [movieId]
      );

      if (movieResult.rows.length === 0) {
        return {
          success: false,
          error: 'Movie not found',
        };
      }

      const movie = movieResult.rows[0];

      // If already watched, return early
      if (movie.status === 'Watched' && movie.watched_date) {
        console.log(`[PlexMovieService] Movie ${movieId} already marked as watched`);
        return {
          success: true,
          alreadyWatched: true,
        };
      }

      // Mark as watched with today's date
      const today = new Date().toISOString().split('T')[0];
      await pool.query(
        `UPDATE movies
         SET status = 'Watched',
             watched_date = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [today, movieId]
      );

      console.log(`[PlexMovieService] Marked movie ${movieId} as watched`);

      return {
        success: true,
        alreadyWatched: false,
      };
    } catch (error) {
      console.error('[PlexMovieService] Error marking movie as watched:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get movie watch stats
   */
  static async getWatchStats(movieId: number): Promise<any> {
    try {
      const result = await pool.query(
        `SELECT
          status,
          watched_date,
          watchlist_added_date,
          rating
         FROM movies
         WHERE id = $1`,
        [movieId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('[PlexMovieService] Error getting watch stats:', error);
      return null;
    }
  }
}
