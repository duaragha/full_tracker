import { NextResponse } from 'next/server';
import { BookSeriesDetectionService } from '@/lib/services/book-series-detection-service';
import { Pool } from 'pg';
import { logger } from '@/lib/logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

/**
 * POST /api/books/[id]/detect-series
 * Detects and links series for a specific book
 *
 * Optional body parameters:
 * - useAI: boolean (default: false) - Enable AI-powered detection
 * - minConfidence: number (default: 0.6) - Minimum confidence threshold (0.0-1.0)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookId = parseInt(id);

    const body = await request.json().catch(() => ({}));
    const useAI = body.useAI || false;
    const minConfidence = body.minConfidence || 0.6;

    // Get book details
    const result = await pool.query(
      'SELECT id, title, author, isbn FROM books WHERE id = $1',
      [bookId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }

    const book = result.rows[0];

    logger.info({
      title: book.title,
      useAI,
      minConfidence,
      bookId,
    }, 'Detecting series for book');

    // Auto-detect series with enhanced options
    const detection = await BookSeriesDetectionService.autoDetectAndLinkSeries(
      book.id,
      book.title,
      book.author,
      book.isbn,
      useAI,
      minConfidence
    );

    if (detection.success) {
      return NextResponse.json({
        success: true,
        message: `Linked to series: ${detection.seriesName}${detection.position ? ` (Position: ${detection.position})` : ''}`,
        data: {
          ...detection,
          detectionMethod: 'enhanced',
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: detection.confidence !== undefined && detection.confidence > 0
          ? `Series detected but confidence too low (${detection.confidence.toFixed(2)} < ${minConfidence})`
          : 'No series detected for this book',
        data: {
          confidence: detection.confidence,
          minConfidence,
        },
      });
    }
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      bookId: id,
    }, 'Error detecting series for book');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect series',
      },
      { status: 500 }
    );
  }
}
