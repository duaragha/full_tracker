import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

interface PlexMovie {
  ratingKey: string;
  guid: string;
  title: string;
  year?: number;
}

interface MatchResult {
  movieId?: number;
  needsConflict: boolean;
  suggestedMovieId?: number;
  suggestedTitle?: string;
  confidence?: number;
}

export class PlexMovieMatchingService {
  /**
   * Find or create mapping for a Plex movie
   */
  static async findOrCreateMapping(plexMovie: PlexMovie): Promise<MatchResult> {
    try {
      // 1. Check if mapping already exists
      const existingMapping = await this.findExistingMapping(plexMovie.ratingKey);
      if (existingMapping) {
        return {
          movieId: existingMapping.movie_id,
          needsConflict: false,
        };
      }

      // 2. Check if there's a pending conflict
      const existingConflict = await this.findExistingConflict(plexMovie.ratingKey);
      if (existingConflict) {
        return {
          needsConflict: true,
          suggestedMovieId: existingConflict.suggested_movie_id,
        };
      }

      // 3. Try to match by title and year
      const match = await this.findMovieMatch(plexMovie.title, plexMovie.year);

      if (match && match.confidence >= 0.9) {
        // High confidence - create automatic mapping
        await this.createMapping(plexMovie, match.id, match.confidence);
        return {
          movieId: match.id,
          needsConflict: false,
        };
      } else if (match && match.confidence >= 0.7) {
        // Medium confidence - create conflict for manual review
        await this.createConflict(plexMovie, match.id, match.title, match.confidence);
        return {
          needsConflict: true,
          suggestedMovieId: match.id,
          suggestedTitle: match.title,
          confidence: match.confidence,
        };
      } else {
        // Low/no confidence - create conflict without suggestion
        await this.createConflict(plexMovie, null, null, 0);
        return {
          needsConflict: true,
        };
      }
    } catch (error) {
      console.error('[PlexMovieMatchingService] Error finding/creating mapping:', error);
      throw error;
    }
  }

  /**
   * Find existing mapping
   */
  private static async findExistingMapping(ratingKey: string): Promise<any> {
    const result = await pool.query(
      'SELECT movie_id FROM plex_movie_mappings WHERE plex_rating_key = $1',
      [ratingKey]
    );
    return result.rows[0] || null;
  }

  /**
   * Find existing conflict
   */
  private static async findExistingConflict(ratingKey: string): Promise<any> {
    const result = await pool.query(
      'SELECT suggested_movie_id FROM plex_movie_conflicts WHERE plex_rating_key = $1 AND status = $2',
      [ratingKey, 'pending']
    );
    return result.rows[0] || null;
  }

  /**
   * Find movie match by title and year
   */
  private static async findMovieMatch(
    title: string,
    year?: number
  ): Promise<{ id: number; title: string; confidence: number } | null> {
    const normalizedTitle = this.normalizeTitle(title);

    // Try exact match first (title + year)
    if (year) {
      const exactResult = await pool.query(
        `SELECT id, title FROM movies
         WHERE LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9 ]', '', 'g')) = $1
         AND release_year = $2
         LIMIT 1`,
        [normalizedTitle, year]
      );

      if (exactResult.rows.length > 0) {
        return {
          id: exactResult.rows[0].id,
          title: exactResult.rows[0].title,
          confidence: 1.0,
        };
      }
    }

    // Try title-only match
    const titleResult = await pool.query(
      `SELECT id, title, release_year FROM movies
       WHERE LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9 ]', '', 'g')) = $1
       LIMIT 1`,
      [normalizedTitle]
    );

    if (titleResult.rows.length > 0) {
      const movie = titleResult.rows[0];
      // If year matches or within 1 year, high confidence
      // If no year or different year, medium confidence
      const yearMatch = year && movie.release_year
        ? Math.abs(year - movie.release_year) <= 1
        : false;

      return {
        id: movie.id,
        title: movie.title,
        confidence: yearMatch ? 0.95 : 0.75,
      };
    }

    // Try fuzzy match (similar title)
    const fuzzyResult = await pool.query(
      `SELECT id, title, release_year,
       SIMILARITY(LOWER(title), $1) as sim
       FROM movies
       WHERE SIMILARITY(LOWER(title), $1) > 0.6
       ORDER BY sim DESC
       LIMIT 1`,
      [title.toLowerCase()]
    );

    if (fuzzyResult.rows.length > 0) {
      const movie = fuzzyResult.rows[0];
      const baseConfidence = movie.sim;
      const yearMatch = year && movie.release_year
        ? Math.abs(year - movie.release_year) <= 1
        : false;

      return {
        id: movie.id,
        title: movie.title,
        confidence: yearMatch ? Math.min(baseConfidence + 0.1, 1.0) : baseConfidence,
      };
    }

    return null;
  }

  /**
   * Create automatic mapping
   */
  private static async createMapping(
    plexMovie: PlexMovie,
    movieId: number,
    confidence: number
  ): Promise<void> {
    await pool.query(
      `INSERT INTO plex_movie_mappings
       (plex_rating_key, plex_guid, plex_title, plex_year, movie_id, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (plex_rating_key) DO NOTHING`,
      [plexMovie.ratingKey, plexMovie.guid, plexMovie.title, plexMovie.year || null, movieId, confidence]
    );
  }

  /**
   * Create conflict for manual resolution
   */
  private static async createConflict(
    plexMovie: PlexMovie,
    suggestedMovieId: number | null,
    suggestedTitle: string | null,
    confidence: number
  ): Promise<void> {
    await pool.query(
      `INSERT INTO plex_movie_conflicts
       (plex_rating_key, plex_guid, plex_title, plex_year, suggested_movie_id, suggested_movie_title, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (plex_rating_key) DO NOTHING`,
      [
        plexMovie.ratingKey,
        plexMovie.guid,
        plexMovie.title,
        plexMovie.year || null,
        suggestedMovieId,
        suggestedTitle,
        confidence,
      ]
    );
  }

  /**
   * Normalize title for comparison (remove special characters, lowercase)
   */
  private static normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim();
  }

  /**
   * Resolve conflict by creating mapping
   */
  static async resolveConflict(conflictId: number, movieId: number): Promise<void> {
    // Get conflict details
    const conflictResult = await pool.query(
      'SELECT plex_rating_key, plex_guid, plex_title, plex_year FROM plex_movie_conflicts WHERE id = $1',
      [conflictId]
    );

    if (conflictResult.rows.length === 0) {
      throw new Error('Conflict not found');
    }

    const conflict = conflictResult.rows[0];

    // Create mapping
    await this.createMapping(
      {
        ratingKey: conflict.plex_rating_key,
        guid: conflict.plex_guid,
        title: conflict.plex_title,
        year: conflict.plex_year,
      },
      movieId,
      1.0 // Manual resolution = 100% confidence
    );

    // Update conflict status
    await pool.query(
      `UPDATE plex_movie_conflicts
       SET status = 'resolved', resolved_movie_id = $1, resolved_at = NOW()
       WHERE id = $2`,
      [movieId, conflictId]
    );
  }
}
