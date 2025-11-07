/**
 * GET /api/cron/audible-sync
 *
 * Vercel Cron endpoint for scheduled Audible sync
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/audible-sync",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { AudibleSyncService } from '@/lib/services/audible-sync-service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

export async function GET(req: NextRequest) {
  // Verify this is a Vercel Cron request
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[Cron] Audible sync triggered');

  try {
    // Check if auto-sync is enabled
    const configResult = await pool.query(
      'SELECT enabled, auto_sync_progress FROM audible_config WHERE user_id = 1'
    );

    if (configResult.rows.length === 0) {
      console.log('[Cron] No Audible configuration found');
      return NextResponse.json({
        success: false,
        message: 'No configuration found',
      });
    }

    const config = configResult.rows[0];

    if (!config.enabled || !config.auto_sync_progress) {
      console.log('[Cron] Auto-sync disabled');
      return NextResponse.json({
        success: false,
        message: 'Auto-sync is disabled',
      });
    }

    // Perform sync
    const result = await AudibleSyncService.syncLibrary(1);

    console.log('[Cron] Sync completed:', {
      status: result.success ? 'success' : 'partial',
      books_synced: result.booksProcessed,
      books_updated: result.booksUpdated,
    });

    return NextResponse.json({
      success: result.success,
      books_synced: result.booksProcessed,
      books_updated: result.booksUpdated,
      new_mappings: result.newMappings,
      conflicts: result.conflicts,
    });
  } catch (error) {
    console.error('[Cron] Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
