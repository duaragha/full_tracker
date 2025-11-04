/**
 * Audible Sync Service
 *
 * Handles synchronization between Audible library and local database
 */

import { Pool } from 'pg';
import { AudibleApiService } from './audible-api-service';
import { AudibleMatchingService } from './audible-matching-service';
import type {
  SyncResult,
  SyncDetails,
  AudibleLibraryItem,
  AudibleConfig,
} from '@/lib/types/audible';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

export class AudibleSyncService {
  /**
   * Perform full library sync
   */
  static async syncLibrary(userId: number = 1): Promise<SyncResult> {
    const startTime = Date.now();
    let syncLogId: number | null = null;

    const result: SyncResult = {
      success: false,
      booksProcessed: 0,
      booksUpdated: 0,
      newMappings: 0,
      conflicts: 0,
      errors: [],
      details: {
        updated: [],
        errors: [],
        new_books: [],
      },
    };

    try {
      // 1. Get config with tokens
      const config = await this.getConfig(userId);
      if (!config) {
        throw new Error('Audible not configured');
      }

      if (!config.enabled) {
        throw new Error('Audible sync is disabled');
      }

      // 2. Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit: ${rateLimitCheck.reason}`);
      }

      // 3. Create sync log
      syncLogId = await this.createSyncLog('scheduled', 'auto_sync');

      // 4. Fetch library from Audible
      const libraryResponse = await AudibleApiService.getLibrary(
        config.access_token!,
        config.refresh_token!,
        config.country_code
      );

      if (!libraryResponse.success) {
        if (libraryResponse.needs_auth) {
          // Token expired, try to refresh
          const refreshed = await AudibleApiService.refreshToken(
            config.refresh_token!,
            config.country_code
          );

          await this.updateTokens(userId, refreshed.access_token, refreshed.expires_at);

          // Retry with new token
          return this.syncLibrary(userId);
        }

        throw new Error(libraryResponse.error || 'Failed to fetch library');
      }

      const books = libraryResponse.books || [];
      result.booksProcessed = books.length;

      // 5. Process each book
      for (const book of books) {
        try {
          const syncedBook = await this.syncBook(book, userId, syncLogId);

          if (syncedBook.isNew) {
            result.newMappings++;
            result.details.new_books?.push({
              asin: book.asin,
              title: book.title,
            });
          }

          if (syncedBook.updated) {
            result.booksUpdated++;
            result.details.updated.push({
              asin: book.asin,
              title: book.title,
              oldProgress: syncedBook.oldProgress || 0,
              newProgress: book.percent_complete,
            });
          }

          if (syncedBook.conflict) {
            result.conflicts++;
          }
        } catch (error) {
          result.errors.push({
            asin: book.asin,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.details.errors.push({
            asin: book.asin,
            title: book.title,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // 6. Update sync timestamp and counter
      await pool.query(
        `UPDATE audible_config
         SET last_sync_at = NOW(),
             sync_count_today = sync_count_today + 1
         WHERE user_id = $1`,
        [userId]
      );

      // 7. Update sync log
      const duration = Date.now() - startTime;
      const status = result.errors.length === 0 ? 'success' : 'partial';

      await pool.query(
        `UPDATE audible_sync_logs
         SET status = $1,
             books_synced = $2,
             books_updated = $3,
             books_failed = $4,
             duration_ms = $5,
             api_calls_made = 1,
             sync_details = $6
         WHERE id = $7`,
        [
          status,
          result.booksProcessed,
          result.booksUpdated,
          result.errors.length,
          duration,
          JSON.stringify(result.details),
          syncLogId,
        ]
      );

      result.success = status === 'success';
      return result;
    } catch (error) {
      console.error('[AudibleSyncService] Sync failed:', error);

      // Update sync log with error
      if (syncLogId) {
        await pool.query(
          `UPDATE audible_sync_logs
           SET status = 'failed',
               error_message = $1,
               duration_ms = $2
           WHERE id = $3`,
          [
            error instanceof Error ? error.message : 'Unknown error',
            Date.now() - startTime,
            syncLogId,
          ]
        );
      }

      throw error;
    }
  }

  /**
   * Sync individual book
   */
  private static async syncBook(
    book: AudibleLibraryItem,
    userId: number,
    syncLogId: number
  ): Promise<{
    isNew: boolean;
    updated: boolean;
    conflict: boolean;
    oldProgress?: number;
  }> {
    // Check if mapping exists
    const mappingResult = await pool.query(
      'SELECT * FROM audible_book_mappings WHERE asin = $1',
      [book.asin]
    );

    let isNew = false;
    let updated = false;
    let conflict = false;
    let oldProgress = 0;

    if (mappingResult.rows.length === 0) {
      // New book - create mapping
      const matchResult = await AudibleMatchingService.findOrCreateMapping({
        asin: book.asin,
        title: book.title,
        author: book.authors.join(', '),
        runtimeMinutes: book.runtime_length_min,
        isbn: book.isbn,
      });

      isNew = true;

      if (matchResult.needsConflict) {
        conflict = true;
      }

      // Create mapping
      await pool.query(
        `INSERT INTO audible_book_mappings (
          asin, audible_title, audible_author, audible_narrator,
          audible_runtime_minutes, audible_cover_url, audible_release_date,
          book_id, match_confidence, match_method,
          last_known_position_seconds, last_known_percentage,
          audible_is_finished, last_synced_from_audible
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          book.asin,
          book.title,
          book.authors.join(', '),
          book.narrators.join(', '),
          book.runtime_length_min,
          book.cover_url,
          book.release_date,
          matchResult.bookId,
          matchResult.confidence,
          matchResult.method,
          book.position_seconds,
          book.percent_complete,
          book.is_finished,
        ]
      );
    } else {
      // Existing mapping - update progress if changed
      const mapping = mappingResult.rows[0];
      oldProgress = mapping.last_known_percentage;

      if (
        mapping.last_known_percentage !== book.percent_complete ||
        mapping.last_known_position_seconds !== book.position_seconds ||
        mapping.audible_is_finished !== book.is_finished
      ) {
        updated = true;

        await pool.query(
          `UPDATE audible_book_mappings
           SET last_known_position_seconds = $1,
               last_known_percentage = $2,
               audible_is_finished = $3,
               last_synced_from_audible = NOW()
           WHERE asin = $4`,
          [book.position_seconds, book.percent_complete, book.is_finished, book.asin]
        );

        // Log progress history
        await pool.query(
          `INSERT INTO audible_progress_history (
            mapping_id, asin, position_seconds, percentage,
            is_finished, sync_log_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            mapping.id,
            book.asin,
            book.position_seconds,
            book.percent_complete,
            book.is_finished,
            syncLogId,
          ]
        );

        // Update tracker book if mapped
        if (mapping.book_id && mapping.sync_enabled) {
          await this.updateTrackerBook(
            mapping.book_id,
            book.percent_complete,
            book.runtime_length_min,
            book.is_finished
          );
        }
      }
    }

    return { isNew, updated, conflict, oldProgress };
  }

  /**
   * Update tracker book with Audible progress
   */
  private static async updateTrackerBook(
    bookId: number,
    percentComplete: number,
    runtimeMinutes: number,
    isFinished: boolean
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Update current_page based on percentage (treat runtime as "pages")
    if (runtimeMinutes > 0) {
      updates.push(`current_page = $${paramIndex}`);
      values.push(Math.floor((percentComplete / 100) * runtimeMinutes));
      paramIndex++;

      updates.push(`minutes = $${paramIndex}`);
      values.push(runtimeMinutes);
      paramIndex++;
    }

    // Update status based on progress
    if (isFinished) {
      updates.push(`status = $${paramIndex}`);
      values.push('Completed');
      paramIndex++;

      updates.push(`completed_date = $${paramIndex}`);
      values.push(new Date());
      paramIndex++;
    } else if (percentComplete > 0) {
      updates.push(`status = $${paramIndex}`);
      values.push('Reading');
      paramIndex++;

      // Set started_date if not set
      const bookResult = await pool.query(
        'SELECT started_date FROM books WHERE id = $1',
        [bookId]
      );
      if (bookResult.rows[0] && !bookResult.rows[0].started_date) {
        updates.push(`started_date = $${paramIndex}`);
        values.push(new Date());
        paramIndex++;
      }
    }

    // Update audible sync metadata
    updates.push(`audible_synced = true`);
    updates.push(`audible_last_sync = NOW()`);
    updates.push(`updated_at = NOW()`);

    values.push(bookId);

    await pool.query(
      `UPDATE books SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }

  /**
   * Get Audible configuration
   */
  private static async getConfig(userId: number): Promise<AudibleConfig | null> {
    const result = await pool.query(
      'SELECT * FROM audible_config WHERE user_id = $1',
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Check rate limiting
   */
  private static async checkRateLimit(userId: number): Promise<{
    allowed: boolean;
    reason: string;
    nextAllowedSync: Date | null;
    syncsRemainingToday: number;
  }> {
    const result = await pool.query('SELECT * FROM audible_can_sync()');

    return {
      allowed: result.rows[0].can_sync,
      reason: result.rows[0].reason,
      nextAllowedSync: result.rows[0].next_allowed_sync,
      syncsRemainingToday: result.rows[0].syncs_remaining_today,
    };
  }

  /**
   * Create sync log entry
   */
  private static async createSyncLog(
    syncType: string,
    triggerSource: string
  ): Promise<number> {
    const result = await pool.query(
      `INSERT INTO audible_sync_logs (sync_type, trigger_source, status)
       VALUES ($1, $2, 'success')
       RETURNING id`,
      [syncType, triggerSource]
    );

    return result.rows[0].id;
  }

  /**
   * Update tokens after refresh
   */
  private static async updateTokens(
    userId: number,
    accessToken: string,
    expiresAt: string
  ): Promise<void> {
    await pool.query(
      `UPDATE audible_config
       SET access_token = $1,
           token_expires_at = $2
       WHERE user_id = $3`,
      [accessToken, expiresAt, userId]
    );
  }
}
