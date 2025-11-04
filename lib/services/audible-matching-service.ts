/**
 * Audible Matching Service
 *
 * Matches Audible audiobooks to tracker books
 */

import { Pool } from 'pg';
import type { MatchResult, PotentialMatch } from '@/lib/types/audible';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

interface AudibleBook {
  asin: string;
  title: string;
  author: string | null;
  runtimeMinutes: number;
  isbn?: string;
}

export class AudibleMatchingService {
  /**
   * Find or create mapping for an Audible book
   */
  static async findOrCreateMapping(audibleBook: AudibleBook): Promise<MatchResult> {
    // Strategy 1: Match by ISBN (highest confidence)
    if (audibleBook.isbn) {
      const isbnMatch = await this.matchByISBN(audibleBook.isbn);
      if (isbnMatch) {
        return {
          bookId: isbnMatch,
          needsConflict: false,
          confidence: 1.0,
          method: 'isbn',
        };
      }
    }

    // Strategy 2: Match by title and author
    const titleAuthorMatches = await this.matchByTitleAuthor(
      audibleBook.title,
      audibleBook.author
    );

    if (titleAuthorMatches.length === 1) {
      // Single match with high confidence
      const match = titleAuthorMatches[0];
      if (match.matchScore >= 0.85) {
        return {
          bookId: match.bookId,
          needsConflict: false,
          confidence: match.matchScore,
          method: 'title_author',
        };
      }
    }

    if (titleAuthorMatches.length > 1) {
      // Multiple matches - create conflict
      const conflictId = await this.createConflict(
        audibleBook,
        'multiple_matches',
        titleAuthorMatches
      );

      return {
        bookId: null,
        needsConflict: true,
        conflictId,
      };
    }

    if (titleAuthorMatches.length === 1 && titleAuthorMatches[0].matchScore < 0.85) {
      // Single match but low confidence - still create conflict
      const conflictId = await this.createConflict(
        audibleBook,
        'multiple_matches',
        titleAuthorMatches
      );

      return {
        bookId: null,
        needsConflict: true,
        conflictId,
      };
    }

    // No matches - create conflict with suggestion to create new book
    const conflictId = await this.createConflict(audibleBook, 'no_match', []);

    return {
      bookId: null,
      needsConflict: true,
      conflictId,
    };
  }

  /**
   * Match by ISBN
   */
  private static async matchByISBN(isbn: string): Promise<number | null> {
    const result = await pool.query(
      `SELECT id FROM books
       WHERE isbn = $1
         AND type = 'Audiobook'
       LIMIT 1`,
      [isbn]
    );

    return result.rows[0]?.id || null;
  }

  /**
   * Match by title and author using fuzzy matching
   */
  private static async matchByTitleAuthor(
    title: string,
    author: string | null
  ): Promise<PotentialMatch[]> {
    // Use PostgreSQL trigram similarity for fuzzy matching
    const result = await pool.query(
      `SELECT
         id,
         title,
         author,
         type,
         GREATEST(
           similarity(LOWER(title), LOWER($1)),
           similarity(LOWER(author), LOWER($2))
         ) as match_score
       FROM books
       WHERE type = 'Audiobook'
         AND (
           similarity(LOWER(title), LOWER($1)) > 0.3
           OR similarity(LOWER(author), LOWER($2)) > 0.3
         )
       ORDER BY match_score DESC
       LIMIT 5`,
      [title, author || '']
    );

    return result.rows.map((row) => ({
      bookId: row.id,
      title: row.title,
      author: row.author,
      type: row.type,
      matchScore: parseFloat(row.match_score),
    }));
  }

  /**
   * Create conflict for manual resolution
   */
  private static async createConflict(
    audibleBook: AudibleBook,
    conflictType: 'multiple_matches' | 'no_match' | 'type_mismatch',
    potentialMatches: PotentialMatch[]
  ): Promise<number> {
    // Check if conflict already exists (unresolved)
    const existingConflict = await pool.query(
      `SELECT id FROM audible_conflicts
       WHERE asin = $1 AND resolved = false
       LIMIT 1`,
      [audibleBook.asin]
    );

    if (existingConflict.rows.length > 0) {
      return existingConflict.rows[0].id;
    }

    // Create new conflict
    const result = await pool.query(
      `INSERT INTO audible_conflicts (
        asin, audible_title, audible_author,
        conflict_type, potential_matches
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [
        audibleBook.asin,
        audibleBook.title,
        audibleBook.author,
        conflictType,
        JSON.stringify(potentialMatches),
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Resolve conflict by selecting a book
   */
  static async resolveConflict(
    conflictId: number,
    bookId: number,
    action: 'user_selected' | 'user_created_new' | 'ignored'
  ): Promise<void> {
    await pool.query(
      `UPDATE audible_conflicts
       SET resolved = true,
           resolved_book_id = $1,
           resolved_at = NOW(),
           resolution_action = $2
       WHERE id = $3`,
      [bookId, action, conflictId]
    );

    // Update mapping if user selected/created a book
    if (action !== 'ignored') {
      const conflict = await pool.query(
        'SELECT asin FROM audible_conflicts WHERE id = $1',
        [conflictId]
      );

      if (conflict.rows.length > 0) {
        await pool.query(
          `UPDATE audible_book_mappings
           SET book_id = $1,
               manually_confirmed = true,
               match_method = 'manual'
           WHERE asin = $2`,
          [bookId, conflict.rows[0].asin]
        );
      }
    }
  }

  /**
   * Link Audible book to tracker book manually
   */
  static async linkBook(asin: string, bookId: number): Promise<void> {
    await pool.query(
      `UPDATE audible_book_mappings
       SET book_id = $1,
           manually_confirmed = true,
           match_method = 'manual',
           match_confidence = 1.0
       WHERE asin = $2`,
      [bookId, asin]
    );
  }

  /**
   * Create new book from Audible data
   */
  static async createBookFromAudible(
    asin: string,
    title: string,
    author: string,
    runtimeMinutes: number,
    status: string = 'Want to Read'
  ): Promise<number> {
    const result = await pool.query(
      `INSERT INTO books (
        title, author, type, status, minutes, source
      ) VALUES ($1, $2, 'Audiobook', $3, $4, 'manual')
      RETURNING id`,
      [title, author, status, runtimeMinutes]
    );

    const bookId = result.rows[0].id;

    // Link to Audible
    await this.linkBook(asin, bookId);

    return bookId;
  }
}
