import { NextResponse } from 'next/server';
import { BookSeriesDetectionService } from '@/lib/services/book-series-detection-service';

// GET all series with their books
export async function GET() {
  try {
    const series = await BookSeriesDetectionService.getAllSeriesWithBooks();

    return NextResponse.json({
      success: true,
      data: series,
    });
  } catch (error) {
    console.error('[API] Error fetching series:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch series',
      },
      { status: 500 }
    );
  }
}

// POST - Link a book to a series
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, seriesName, position } = body;

    if (!bookId || !seriesName) {
      return NextResponse.json(
        { success: false, error: 'bookId and seriesName are required' },
        { status: 400 }
      );
    }

    // Find or create series
    const seriesId = await BookSeriesDetectionService.findOrCreateSeries(seriesName);

    // Link book to series
    await BookSeriesDetectionService.linkBookToSeries(
      bookId,
      seriesId,
      position,
      'manual',
      1.0
    );

    return NextResponse.json({
      success: true,
      message: 'Book linked to series successfully',
    });
  } catch (error) {
    console.error('[API] Error linking book to series:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link book to series',
      },
      { status: 500 }
    );
  }
}
