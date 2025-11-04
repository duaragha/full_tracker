/**
 * POST /api/audible/conflicts/:id/resolve
 *
 * Resolve an Audible conflict
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { AudibleMatchingService } from '@/lib/services/audible-matching-service';
import type {
  ResolveAudibleConflictRequest,
  ResolveAudibleConflictResponse,
} from '@/lib/types/audible';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conflictId = parseInt(params.id);
    const body: ResolveAudibleConflictRequest = await req.json();
    const { book_id, create_new, ignore, book_data } = body;

    // Verify conflict exists
    const conflictResult = await pool.query(
      'SELECT * FROM audible_conflicts WHERE id = $1',
      [conflictId]
    );

    if (conflictResult.rows.length === 0) {
      return NextResponse.json<ResolveAudibleConflictResponse>(
        {
          success: false,
          message: 'Conflict not found',
        },
        { status: 404 }
      );
    }

    const conflict = conflictResult.rows[0];

    if (conflict.resolved) {
      return NextResponse.json<ResolveAudibleConflictResponse>(
        {
          success: false,
          message: 'Conflict already resolved',
        },
        { status: 400 }
      );
    }

    if (ignore) {
      // Ignore conflict
      await AudibleMatchingService.resolveConflict(conflictId, 0, 'ignored');

      return NextResponse.json<ResolveAudibleConflictResponse>({
        success: true,
        message: 'Conflict ignored',
      });
    } else if (create_new && book_data) {
      // Create new book
      const newBookId = await AudibleMatchingService.createBookFromAudible(
        conflict.asin,
        book_data.title || conflict.audible_title,
        book_data.author || conflict.audible_author,
        0, // Runtime will be set on next sync
        book_data.status || 'Want to Read'
      );

      await AudibleMatchingService.resolveConflict(
        conflictId,
        newBookId,
        'user_created_new'
      );

      return NextResponse.json<ResolveAudibleConflictResponse>({
        success: true,
        message: 'Created new book and resolved conflict',
        book_id: newBookId,
      });
    } else if (book_id) {
      // Link to existing book
      await AudibleMatchingService.linkBook(conflict.asin, book_id);
      await AudibleMatchingService.resolveConflict(
        conflictId,
        book_id,
        'user_selected'
      );

      return NextResponse.json<ResolveAudibleConflictResponse>({
        success: true,
        message: 'Linked to existing book and resolved conflict',
        book_id,
      });
    } else {
      return NextResponse.json<ResolveAudibleConflictResponse>(
        {
          success: false,
          message: 'Must provide book_id, create_new, or ignore',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Audible Resolve Conflict] Error:', error);
    return NextResponse.json<ResolveAudibleConflictResponse>(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
