/**
 * POST /api/audible/sync
 *
 * Trigger Audible library sync (manual or scheduled)
 */

import { NextRequest, NextResponse } from 'next/server';
import { AudibleSyncService } from '@/lib/services/audible-sync-service';
import type { SyncAudibleRequest, SyncAudibleResponse } from '@/lib/types/audible';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: SyncAudibleRequest = await req.json().catch(() => ({}));
    const { force = false } = body;

    console.log('[Audible Sync] Starting sync...', { force });

    // Perform sync
    const result = await AudibleSyncService.syncLibrary(1);

    const duration = Date.now() - startTime;

    return NextResponse.json<SyncAudibleResponse>({
      success: result.success,
      status: result.success ? 'success' : 'partial',
      books_synced: result.booksProcessed,
      books_updated: result.booksUpdated,
      new_mappings: result.newMappings,
      conflicts: result.conflicts,
      duration_ms: duration,
      details: result.details,
    });
  } catch (error) {
    console.error('[Audible Sync] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;

    // Check for rate limiting error
    if (errorMessage.includes('Rate limit')) {
      return NextResponse.json<SyncAudibleResponse>(
        {
          success: false,
          status: 'failed',
          books_synced: 0,
          books_updated: 0,
          new_mappings: 0,
          conflicts: 0,
          duration_ms: duration,
          error: errorMessage,
        },
        { status: 429 }
      );
    }

    return NextResponse.json<SyncAudibleResponse>(
      {
        success: false,
        status: 'failed',
        books_synced: 0,
        books_updated: 0,
        new_mappings: 0,
        conflicts: 0,
        duration_ms: duration,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
