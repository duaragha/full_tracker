import { Pool } from 'pg';
import { PlexMatchingService } from './plex-matching-service';
import { PlexEpisodeService } from './plex-episode-service';
import { PlexMovieMatchingService } from './plex-movie-matching-service';
import { PlexMovieService } from './plex-movie-service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

interface PlexWebhookPayload {
  event: string;
  user: boolean;
  owner: boolean;
  Account: {
    id: number;
    thumb: string;
    title: string;
  };
  Server: {
    title: string;
    uuid: string;
  };
  Player: {
    local: boolean;
    publicAddress: string;
    title: string;
    uuid: string;
  };
  Metadata: {
    librarySectionType: string;
    ratingKey: string;
    key: string;
    parentRatingKey?: string;
    grandparentRatingKey?: string;
    guid: string;
    type: string;
    title: string;
    parentTitle?: string;
    grandparentTitle?: string;
    summary?: string;
    index?: number;
    parentIndex?: number;
    year?: number;
    thumb?: string;
    art?: string;
    addedAt?: number;
    updatedAt?: number;
  };
}

interface ProcessResult {
  status: 'success' | 'failed' | 'ignored' | 'duplicate';
  action: string;
  tvshowId?: number;
  error?: string;
  duration: number;
}

export class PlexWebhookService {
  /**
   * Process incoming webhook from Plex
   */
  static async processWebhook(payload: PlexWebhookPayload): Promise<ProcessResult> {
    const startTime = Date.now();

    try {
      // 1. Validate payload
      if (!this.validatePayload(payload)) {
        return {
          status: 'failed',
          action: 'validation_failed',
          error: 'Invalid payload structure',
          duration: Date.now() - startTime,
        };
      }

      // 2. Only process scrobble events for TV episodes and movies
      if (payload.event !== 'media.scrobble') {
        await this.logWebhook(payload, 'ignored', 'event_not_scrobble', null);
        return {
          status: 'ignored',
          action: 'event_not_scrobble',
          duration: Date.now() - startTime,
        };
      }

      if (payload.Metadata.type !== 'episode' && payload.Metadata.type !== 'movie') {
        await this.logWebhook(payload, 'ignored', 'not_supported_type', null);
        return {
          status: 'ignored',
          action: 'not_supported_type',
          duration: Date.now() - startTime,
        };
      }

      // Route to appropriate handler
      if (payload.Metadata.type === 'episode') {
        return await this.processEpisodeScrobble(payload, startTime);
      } else {
        return await this.processMovieScrobble(payload, startTime);
      }
    } catch (error) {
      console.error('[PlexWebhookService] Error processing webhook:', error);
      await this.logWebhook(
        payload,
        'failed',
        'processing_error',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return {
        status: 'failed',
        action: 'processing_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Process episode scrobble
   */
  private static async processEpisodeScrobble(
    payload: PlexWebhookPayload,
    startTime: number
  ): Promise<ProcessResult> {
    try {

      // Check for duplicate (within last 5 minutes)
      const isDuplicate = await this.checkDuplicate(
        payload.Metadata.grandparentRatingKey || payload.Metadata.ratingKey,
        payload.Metadata.parentIndex,
        payload.Metadata.index
      );

      if (isDuplicate) {
        await this.logWebhook(payload, 'duplicate', 'ignored_duplicate', null);
        return {
          status: 'duplicate',
          action: 'ignored_duplicate',
          duration: Date.now() - startTime,
        };
      }

      // Check if auto-mark-watched is enabled
      const config = await this.getConfig();
      if (!config.auto_mark_watched) {
        await this.logWebhook(payload, 'ignored', 'auto_mark_disabled', null);
        return {
          status: 'ignored',
          action: 'auto_mark_disabled',
          duration: Date.now() - startTime,
        };
      }

      // Find or create show mapping
      const plexShow = {
        ratingKey: payload.Metadata.grandparentRatingKey!,
        guid: payload.Metadata.guid,
        title: payload.Metadata.grandparentTitle!,
        year: payload.Metadata.year,
      };

      const matchResult = await PlexMatchingService.findOrCreateMapping(plexShow);

      if (matchResult.needsConflict || !matchResult.tvshowId) {
        // Conflict created, needs manual resolution
        await this.logWebhook(payload, 'success', 'conflict_created', null);
        return {
          status: 'success',
          action: 'conflict_created',
          duration: Date.now() - startTime,
        };
      }

      // Mark episode as watched
      const episodeResult = await PlexEpisodeService.markEpisodeWatched(
        matchResult.tvshowId,
        payload.Metadata.parentIndex!,
        payload.Metadata.index!
      );

      if (!episodeResult.success) {
        await this.logWebhook(
          payload,
          'failed',
          'episode_mark_failed',
          episodeResult.error
        );
        return {
          status: 'failed',
          action: 'episode_mark_failed',
          error: episodeResult.error,
          duration: Date.now() - startTime,
        };
      }

      const action = episodeResult.alreadyWatched
        ? 'already_watched'
        : 'marked_watched';

      await this.logWebhook(payload, 'success', action, null);

      // Update last webhook received time
      await pool.query(
        'UPDATE plex_config SET last_webhook_received = NOW() WHERE user_id = 1'
      );

      return {
        status: 'success',
        action,
        tvshowId: matchResult.tvshowId,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[PlexWebhookService] Error processing episode:', error);
      return {
        status: 'failed',
        action: 'processing_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Process movie scrobble
   */
  private static async processMovieScrobble(
    payload: PlexWebhookPayload,
    startTime: number
  ): Promise<ProcessResult> {
    try {
      // Check for duplicate (within last 5 minutes)
      const isDuplicate = await this.checkDuplicate(
        payload.Metadata.ratingKey,
        undefined,
        undefined
      );

      if (isDuplicate) {
        await this.logWebhook(payload, 'duplicate', 'ignored_duplicate', null);
        return {
          status: 'duplicate',
          action: 'ignored_duplicate',
          duration: Date.now() - startTime,
        };
      }

      // Check if auto-mark-watched is enabled
      const config = await this.getConfig();
      if (!config.auto_mark_watched) {
        await this.logWebhook(payload, 'ignored', 'auto_mark_disabled', null);
        return {
          status: 'ignored',
          action: 'auto_mark_disabled',
          duration: Date.now() - startTime,
        };
      }

      // Find or create movie mapping
      const plexMovie = {
        ratingKey: payload.Metadata.ratingKey,
        guid: payload.Metadata.guid,
        title: payload.Metadata.title,
        year: payload.Metadata.year,
      };

      const matchResult = await PlexMovieMatchingService.findOrCreateMapping(plexMovie);

      if (matchResult.needsConflict || !matchResult.movieId) {
        // Conflict created, needs manual resolution
        await this.logWebhook(payload, 'success', 'conflict_created', null);
        return {
          status: 'success',
          action: 'conflict_created',
          duration: Date.now() - startTime,
        };
      }

      // Mark movie as watched
      const movieResult = await PlexMovieService.markMovieWatched(matchResult.movieId);

      if (!movieResult.success) {
        await this.logWebhook(
          payload,
          'failed',
          'movie_mark_failed',
          movieResult.error
        );
        return {
          status: 'failed',
          action: 'movie_mark_failed',
          error: movieResult.error,
          duration: Date.now() - startTime,
        };
      }

      const action = movieResult.alreadyWatched
        ? 'already_watched'
        : 'marked_watched';

      await this.logWebhook(payload, 'success', action, null);

      // Update last webhook received time
      await pool.query(
        'UPDATE plex_config SET last_webhook_received = NOW() WHERE user_id = 1'
      );

      return {
        status: 'success',
        action,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[PlexWebhookService] Error processing movie:', error);
      return {
        status: 'failed',
        action: 'processing_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate webhook payload structure
   */
  private static validatePayload(payload: any): boolean {
    if (!payload || !payload.event) {
      return false;
    }

    // Only media events require Metadata
    if (payload.event.startsWith('media.')) {
      if (!payload.Metadata) {
        return false;
      }

      // For episode scrobbles, require episode metadata
      if (payload.event === 'media.scrobble' && payload.Metadata.type === 'episode') {
        return !!(
          payload.Metadata.grandparentRatingKey &&
          payload.Metadata.grandparentTitle &&
          payload.Metadata.parentIndex !== undefined &&
          payload.Metadata.index !== undefined &&
          payload.Metadata.guid
        );
      }

      // For movie scrobbles, require movie metadata
      if (payload.event === 'media.scrobble' && payload.Metadata.type === 'movie') {
        return !!(
          payload.Metadata.ratingKey &&
          payload.Metadata.title &&
          payload.Metadata.guid
        );
      }
    }

    return true;
  }

  /**
   * Check if this webhook is a duplicate scrobble event (within 5 minutes)
   */
  private static async checkDuplicate(
    ratingKey: string,
    seasonNumber?: number,
    episodeNumber?: number
  ): Promise<boolean> {
    const result = await pool.query(
      `SELECT id FROM plex_webhook_logs
       WHERE plex_rating_key = $1
         AND plex_season = $2
         AND plex_episode = $3
         AND event_type = 'media.scrobble'
         AND created_at > NOW() - INTERVAL '5 minutes'
       LIMIT 1`,
      [ratingKey, seasonNumber, episodeNumber]
    );

    return result.rows.length > 0;
  }

  /**
   * Get Plex configuration
   */
  private static async getConfig(): Promise<any> {
    const result = await pool.query(
      'SELECT enabled, auto_add_shows, auto_mark_watched FROM plex_config WHERE user_id = 1'
    );

    if (result.rows.length === 0) {
      return {
        enabled: false,
        auto_add_shows: false,
        auto_mark_watched: false,
      };
    }

    return result.rows[0];
  }

  /**
   * Log webhook to database
   */
  private static async logWebhook(
    payload: any,
    status: string,
    action: string,
    error: string | null
  ): Promise<void> {
    try {
      const metadata = payload.Metadata || {};
      await pool.query(
        `INSERT INTO plex_webhook_logs (
          event_type,
          plex_rating_key,
          plex_title,
          plex_season,
          plex_episode,
          payload,
          status,
          action_taken,
          error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          payload.event,
          metadata.grandparentRatingKey || metadata.ratingKey || null,
          metadata.grandparentTitle || metadata.title || null,
          metadata.parentIndex || null,
          metadata.index || null,
          JSON.stringify(payload),
          status,
          action,
          error,
        ]
      );
    } catch (err) {
      console.error('[PlexWebhookService] Error logging webhook:', err);
    }
  }
}
