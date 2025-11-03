import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

interface PlexShow {
  ratingKey: string;
  guid: string;
  title: string;
  year?: number;
}

interface MatchResult {
  tvshowId: number | null;
  confidence: number;
  method: string;
  needsConflict: boolean;
  potentialMatches?: any[];
}

interface ExternalIds {
  tmdbId?: string;
  tvdbId?: string;
  imdbId?: string;
}

export class PlexMatchingService {
  /**
   * Find or create a mapping between Plex show and tracker show
   */
  static async findOrCreateMapping(plexShow: PlexShow): Promise<MatchResult> {
    try {
      // 1. Check if mapping already exists
      const existingMapping = await pool.query(
        'SELECT tvshow_id, match_confidence, match_method FROM plex_show_mappings WHERE plex_rating_key = $1',
        [plexShow.ratingKey]
      );

      if (existingMapping.rows.length > 0) {
        return {
          tvshowId: existingMapping.rows[0].tvshow_id,
          confidence: existingMapping.rows[0].match_confidence,
          method: existingMapping.rows[0].match_method,
          needsConflict: false,
        };
      }

      // 2. Extract external IDs from Plex GUID
      const externalIds = this.extractExternalIds(plexShow.guid);

      // 3. Try TMDB ID match (highest confidence)
      if (externalIds.tmdbId) {
        const tmdbMatch = await this.matchByTmdbId(externalIds.tmdbId);
        if (tmdbMatch) {
          await this.createMapping(plexShow, tmdbMatch.id, 1.0, 'tmdb_id', externalIds);
          return {
            tvshowId: tmdbMatch.id,
            confidence: 1.0,
            method: 'tmdb_id',
            needsConflict: false,
          };
        }
      }

      // 4. Try TVDB ID match (convert to TMDB via API)
      if (externalIds.tvdbId) {
        const tvdbMatch = await this.matchByTvdbId(externalIds.tvdbId);
        if (tvdbMatch) {
          await this.createMapping(plexShow, tvdbMatch.id, 0.95, 'tvdb_id', externalIds);
          return {
            tvshowId: tvdbMatch.id,
            confidence: 0.95,
            method: 'tvdb_id',
            needsConflict: false,
          };
        }
      }

      // 5. Try IMDB ID match (convert to TMDB via API)
      if (externalIds.imdbId) {
        const imdbMatch = await this.matchByImdbId(externalIds.imdbId);
        if (imdbMatch) {
          await this.createMapping(plexShow, imdbMatch.id, 0.95, 'imdb_id', externalIds);
          return {
            tvshowId: imdbMatch.id,
            confidence: 0.95,
            method: 'imdb_id',
            needsConflict: false,
          };
        }
      }

      // 6. Try fuzzy title + year match
      const fuzzyMatches = await this.matchByTitleAndYear(plexShow.title, plexShow.year);

      if (fuzzyMatches.length === 0) {
        // No matches found - create conflict
        await this.createConflict(plexShow, 'no_match', [], externalIds);
        return {
          tvshowId: null,
          confidence: 0,
          method: 'none',
          needsConflict: true,
        };
      }

      if (fuzzyMatches.length === 1 && fuzzyMatches[0].confidence >= 0.90) {
        // Single high-confidence match - auto-map
        await this.createMapping(
          plexShow,
          fuzzyMatches[0].id,
          fuzzyMatches[0].confidence,
          'title_year',
          externalIds
        );
        return {
          tvshowId: fuzzyMatches[0].id,
          confidence: fuzzyMatches[0].confidence,
          method: 'title_year',
          needsConflict: false,
        };
      }

      // Multiple matches or low confidence - create conflict
      await this.createConflict(
        plexShow,
        fuzzyMatches.length > 1 ? 'multiple_matches' : 'ambiguous',
        fuzzyMatches,
        externalIds
      );

      return {
        tvshowId: null,
        confidence: fuzzyMatches[0]?.confidence || 0,
        method: 'conflict',
        needsConflict: true,
        potentialMatches: fuzzyMatches,
      };
    } catch (error) {
      console.error('[PlexMatchingService] Error finding mapping:', error);
      throw error;
    }
  }

  /**
   * Extract external IDs from Plex GUID
   * Examples:
   * - plex://show/5d9c086fe9d5a1001e9d4d3c
   * - com.plexapp.agents.themoviedb://1418?lang=en
   * - com.plexapp.agents.thetvdb://73244?lang=en
   * - com.plexapp.agents.imdb://tt0386676?lang=en
   */
  private static extractExternalIds(guid: string): ExternalIds {
    const ids: ExternalIds = {};

    // TMDB ID
    const tmdbMatch = guid.match(/themoviedb:\/\/(\d+)/);
    if (tmdbMatch) {
      ids.tmdbId = tmdbMatch[1];
    }

    // TVDB ID
    const tvdbMatch = guid.match(/thetvdb:\/\/(\d+)/);
    if (tvdbMatch) {
      ids.tvdbId = tvdbMatch[1];
    }

    // IMDB ID
    const imdbMatch = guid.match(/imdb:\/\/(tt\d+)/);
    if (imdbMatch) {
      ids.imdbId = imdbMatch[1];
    }

    return ids;
  }

  /**
   * Match by TMDB ID (exact match)
   */
  private static async matchByTmdbId(tmdbId: string): Promise<any> {
    const result = await pool.query(
      'SELECT id, title, tmdb_id FROM tvshows WHERE tmdb_id = $1',
      [parseInt(tmdbId)]
    );
    return result.rows[0] || null;
  }

  /**
   * Match by TVDB ID (convert to TMDB via API)
   */
  private static async matchByTvdbId(tvdbId: string): Promise<any> {
    try {
      // Call TMDB API to convert TVDB ID to TMDB ID
      const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/find/${tvdbId}?api_key=${tmdbApiKey}&external_source=tvdb_id`
      );
      const data = await response.json();

      if (data.tv_results && data.tv_results.length > 0) {
        const tmdbId = data.tv_results[0].id;
        return await this.matchByTmdbId(tmdbId.toString());
      }

      return null;
    } catch (error) {
      console.error('[PlexMatchingService] Error converting TVDB ID:', error);
      return null;
    }
  }

  /**
   * Match by IMDB ID (convert to TMDB via API)
   */
  private static async matchByImdbId(imdbId: string): Promise<any> {
    try {
      // Call TMDB API to convert IMDB ID to TMDB ID
      const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/find/${imdbId}?api_key=${tmdbApiKey}&external_source=imdb_id`
      );
      const data = await response.json();

      if (data.tv_results && data.tv_results.length > 0) {
        const tmdbId = data.tv_results[0].id;
        return await this.matchByTmdbId(tmdbId.toString());
      }

      return null;
    } catch (error) {
      console.error('[PlexMatchingService] Error converting IMDB ID:', error);
      return null;
    }
  }

  /**
   * Match by title and year using fuzzy matching
   * FIXED: Use show_start_date instead of first_aired
   */
  private static async matchByTitleAndYear(
    title: string,
    year?: number
  ): Promise<any[]> {
    try {
      let query = `
        SELECT
          id,
          title,
          show_start_date,
          tmdb_id,
          similarity(title, $1) as confidence
        FROM tvshows
        WHERE similarity(title, $1) > 0.6
      `;

      const params: any[] = [title];

      if (year) {
        query += ` AND EXTRACT(YEAR FROM show_start_date) BETWEEN $2 AND $3`;
        params.push(year - 1, year + 1);
      }

      query += ` ORDER BY confidence DESC LIMIT 5`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PlexMatchingService] Error with fuzzy matching:', error);
      return [];
    }
  }

  /**
   * Create a mapping in the database
   */
  private static async createMapping(
    plexShow: PlexShow,
    tvshowId: number,
    confidence: number,
    method: string,
    externalIds: ExternalIds
  ): Promise<void> {
    // Check if mapping already exists
    const existing = await pool.query(
      'SELECT id FROM plex_show_mappings WHERE plex_rating_key = $1',
      [plexShow.ratingKey]
    );

    if (existing.rows.length > 0) {
      // Update existing mapping
      await pool.query(
        `UPDATE plex_show_mappings SET
          tvshow_id = $1,
          match_confidence = $2,
          match_method = $3,
          updated_at = NOW()
        WHERE plex_rating_key = $4`,
        [tvshowId, confidence, method, plexShow.ratingKey]
      );
    } else {
      // Create new mapping
      await pool.query(
        `INSERT INTO plex_show_mappings (
          plex_rating_key, plex_guid, plex_title, plex_year,
          tvshow_id, tmdb_id, tvdb_id, imdb_id,
          match_confidence, match_method, sync_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)`,
        [
          plexShow.ratingKey,
          plexShow.guid,
          plexShow.title,
          plexShow.year,
          tvshowId,
          externalIds.tmdbId ? parseInt(externalIds.tmdbId) : null,
          externalIds.tvdbId ? parseInt(externalIds.tvdbId) : null,
          externalIds.imdbId,
          confidence,
          method,
        ]
      );
    }
  }

  /**
   * Create a conflict for manual resolution
   */
  private static async createConflict(
    plexShow: PlexShow,
    conflictType: string,
    potentialMatches: any[],
    externalIds: ExternalIds
  ): Promise<void> {
    // Check if unresolved conflict already exists
    const existing = await pool.query(
      'SELECT id FROM plex_conflicts WHERE plex_rating_key = $1 AND resolved = false',
      [plexShow.ratingKey]
    );

    if (existing.rows.length > 0) {
      // Update existing conflict
      await pool.query(
        `UPDATE plex_conflicts SET
          conflict_type = $1,
          potential_matches = $2,
          updated_at = NOW()
        WHERE plex_rating_key = $3 AND resolved = false`,
        [conflictType, JSON.stringify(potentialMatches), plexShow.ratingKey]
      );
    } else {
      // Create new conflict
      await pool.query(
        `INSERT INTO plex_conflicts (
          plex_rating_key, plex_guid, plex_title, plex_year,
          conflict_type, potential_matches
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          plexShow.ratingKey,
          plexShow.guid,
          plexShow.title,
          plexShow.year,
          conflictType,
          JSON.stringify(potentialMatches),
        ]
      );
    }
  }
}
