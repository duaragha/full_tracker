import { NextResponse } from 'next/server';
import { BookSeriesDetectionService } from '@/lib/services/book-series-detection-service';

/**
 * POST /api/books/series/scan
 * Scans all books without series and attempts to detect and link them
 *
 * Optional body parameters:
 * - useAI: boolean (default: false) - Enable AI-powered detection
 * - minConfidence: number (default: 0.6) - Minimum confidence threshold (0.0-1.0)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const useAI = body.useAI || false;
    const minConfidence = body.minConfidence || 0.6;

    console.log(`[API] Starting series scan (AI: ${useAI}, minConfidence: ${minConfidence})`);

    const result = await BookSeriesDetectionService.scanAllBooksForSeries(
      useAI,
      minConfidence
    );

    const message = `Scanned ${result.scanned} books. Linked ${result.linked} to series. ${result.skipped} skipped (low confidence). ${result.failed} failed.`;

    console.log(`[API] ${message}`);

    return NextResponse.json({
      success: true,
      message,
      data: {
        ...result,
        successRate: result.scanned > 0
          ? ((result.linked / result.scanned) * 100).toFixed(1) + '%'
          : '0%',
      },
    });
  } catch (error) {
    console.error('[API] Error scanning books for series:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan books',
      },
      { status: 500 }
    );
  }
}
