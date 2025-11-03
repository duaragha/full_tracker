import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

interface EpisodeData {
  seasonNumber: number;
  episodeNumber: number;
  watchedDate?: Date;
}

export class PlexEpisodeService {
  /**
   * Mark an episode as watched in the tracker
   */
  static async markEpisodeWatched(
    tvshowId: number,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<{ success: boolean; alreadyWatched: boolean; error?: string }> {
    try {
      // 1. Get the show from database
      const showResult = await pool.query(
        'SELECT id, title, seasons FROM tvshows WHERE id = $1',
        [tvshowId]
      );

      if (showResult.rows.length === 0) {
        return {
          success: false,
          alreadyWatched: false,
          error: 'Show not found in tracker',
        };
      }

      const show = showResult.rows[0];
      const seasons = show.seasons || [];

      // 2. Find the season
      const season = seasons.find((s: any) => s.seasonNumber === seasonNumber);

      if (!season) {
        return {
          success: false,
          alreadyWatched: false,
          error: `Season ${seasonNumber} not found in show data`,
        };
      }

      // 3. Find the episode
      const episode = season.episodes?.find(
        (e: any) => e.episodeNumber === episodeNumber
      );

      if (!episode) {
        return {
          success: false,
          alreadyWatched: false,
          error: `Episode S${seasonNumber}E${episodeNumber} not found in season data`,
        };
      }

      // 4. Check if already watched
      if (episode.watched) {
        console.log(
          `[PlexEpisodeService] Episode already watched, preserving existing watch date`
        );
        return {
          success: true,
          alreadyWatched: true,
        };
      }

      // 5. Mark episode as watched
      episode.watched = true;
      episode.dateWatched = new Date().toISOString();

      // 6. Update the database
      await pool.query(
        `UPDATE tvshows
         SET seasons = $1,
             plex_synced = true,
             plex_last_sync = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(seasons), tvshowId]
      );

      // 7. Recalculate totals
      await this.recalculateTotals(tvshowId, seasons);

      console.log(
        `[PlexEpisodeService] Marked episode as watched: ${show.title} S${seasonNumber}E${episodeNumber}`
      );

      return {
        success: true,
        alreadyWatched: false,
      };
    } catch (error) {
      console.error('[PlexEpisodeService] Error marking episode watched:', error);
      return {
        success: false,
        alreadyWatched: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Recalculate watched episodes and total minutes
   */
  private static async recalculateTotals(
    tvshowId: number,
    seasons: any[]
  ): Promise<void> {
    let totalWatchedEpisodes = 0;
    let totalEpisodes = 0;

    seasons.forEach((season: any) => {
      if (season.episodes) {
        totalEpisodes += season.episodes.length;
        totalWatchedEpisodes += season.episodes.filter((e: any) => e.watched).length;
      }
    });

    await pool.query(
      `UPDATE tvshows
       SET watched_episodes = $1,
           total_episodes = $2
       WHERE id = $3`,
      [totalWatchedEpisodes, totalEpisodes, tvshowId]
    );
  }

  /**
   * Mark multiple episodes as watched (for batch operations)
   */
  static async markMultipleEpisodesWatched(
    tvshowId: number,
    episodes: EpisodeData[]
  ): Promise<{ success: number; failed: number; alreadyWatched: number }> {
    let success = 0;
    let failed = 0;
    let alreadyWatched = 0;

    for (const episode of episodes) {
      const result = await this.markEpisodeWatched(
        tvshowId,
        episode.seasonNumber,
        episode.episodeNumber
      );

      if (result.success) {
        if (result.alreadyWatched) {
          alreadyWatched++;
        } else {
          success++;
        }
      } else {
        failed++;
      }
    }

    return { success, failed, alreadyWatched };
  }

  /**
   * Get episode watch status
   */
  static async getEpisodeStatus(
    tvshowId: number,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<{ watched: boolean; dateWatched?: string }> {
    try {
      const result = await pool.query(
        'SELECT seasons FROM tvshows WHERE id = $1',
        [tvshowId]
      );

      if (result.rows.length === 0) {
        return { watched: false };
      }

      const seasons = result.rows[0].seasons || [];
      const season = seasons.find((s: any) => s.seasonNumber === seasonNumber);

      if (!season) {
        return { watched: false };
      }

      const episode = season.episodes?.find(
        (e: any) => e.episodeNumber === episodeNumber
      );

      if (!episode) {
        return { watched: false };
      }

      return {
        watched: episode.watched || false,
        dateWatched: episode.dateWatched,
      };
    } catch (error) {
      console.error('[PlexEpisodeService] Error getting episode status:', error);
      return { watched: false };
    }
  }

  /**
   * Sync full show progress from Plex (for historical sync)
   * This would require additional Plex API calls
   */
  static async syncShowProgress(
    plexToken: string,
    plexRatingKey: string,
    tvshowId: number
  ): Promise<{ synced: number; failed: number }> {
    // TODO: Implement full show sync
    // This would:
    // 1. Call Plex API to get all watched episodes
    // 2. Mark each one as watched in tracker
    // 3. Return stats

    console.warn('[PlexEpisodeService] Full show sync not yet implemented');
    return { synced: 0, failed: 0 };
  }
}
