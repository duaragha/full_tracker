/**
 * POST /api/audible/link
 *
 * Link Audible book to tracker book or create new book
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { AudibleMatchingService } from '@/lib/services/audible-matching-service';
import type { LinkAudibleBookRequest, LinkAudibleBookResponse } from '@/lib/types/audible';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

export async function POST(req: NextRequest) {
  try {
    const body: LinkAudibleBookRequest = await req.json();
    const { asin, book_id, create_new, book_data } = body;

    if (!asin) {
      return NextResponse.json<LinkAudibleBookResponse>(
        {
          success: false,
          message: 'ASIN is required',
        },
        { status: 400 }
      );
    }

    // Verify mapping exists
    const mappingResult = await pool.query(
      'SELECT * FROM audible_book_mappings WHERE asin = $1',
      [asin]
    );

    if (mappingResult.rows.length === 0) {
      return NextResponse.json<LinkAudibleBookResponse>(
        {
          success: false,
          message: 'Audible book mapping not found',
        },
        { status: 404 }
      );
    }

    const mapping = mappingResult.rows[0];

    if (create_new && book_data) {
      // Create new book from Audible data
      const newBookId = await AudibleMatchingService.createBookFromAudible(
        asin,
        book_data.title || mapping.audible_title,
        book_data.author || mapping.audible_author,
        mapping.audible_runtime_minutes,
        book_data.status || 'Want to Read'
      );

      return NextResponse.json<LinkAudibleBookResponse>({
        success: true,
        message: 'Created new book and linked to Audible',
        mapping_id: mapping.id,
        book_id: newBookId,
      });
    } else if (book_id) {
      // Link to existing book
      await AudibleMatchingService.linkBook(asin, book_id);

      return NextResponse.json<LinkAudibleBookResponse>({
        success: true,
        message: 'Linked Audible book to tracker book',
        mapping_id: mapping.id,
        book_id,
      });
    } else {
      return NextResponse.json<LinkAudibleBookResponse>(
        {
          success: false,
          message: 'Must provide either book_id or create_new with book_data',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Audible Link] Error:', error);
    return NextResponse.json<LinkAudibleBookResponse>(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
