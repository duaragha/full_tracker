/**
 * GET /api/audible/status
 *
 * Get sync status and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import type { GetAudibleStatusResponse } from '@/lib/types/audible';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

export async function GET(req: NextRequest) {
  try {
    // Check if sync is allowed
    const rateLimitResult = await pool.query('SELECT * FROM audible_can_sync()');
    const rateLimit = rateLimitResult.rows[0];

    // Get last sync info
    const lastSyncResult = await pool.query(
      `SELECT status, books_synced, created_at
       FROM audible_sync_logs
       ORDER BY created_at DESC
       LIMIT 1`
    );

    // Get statistics
    const statsResult = await pool.query('SELECT * FROM audible_sync_stats');
    const stats = statsResult.rows[0] || {
      total_mappings: 0,
      mapped: 0,
      unmapped: 0,
    };

    // Get currently reading count
    const currentlyReadingResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM audible_book_mappings
       WHERE last_known_percentage > 0
         AND last_known_percentage < 100
         AND audible_is_finished = false`
    );

    const response: GetAudibleStatusResponse = {
      can_sync: rateLimit.can_sync,
      reason: rateLimit.reason,
      next_allowed_sync: rateLimit.next_allowed_sync?.toISOString() || null,
      syncs_remaining_today: rateLimit.syncs_remaining_today,
      last_sync: lastSyncResult.rows[0]
        ? {
            status: lastSyncResult.rows[0].status,
            books_synced: lastSyncResult.rows[0].books_synced,
            created_at: lastSyncResult.rows[0].created_at.toISOString(),
          }
        : undefined,
      stats: {
        total_mappings: stats.total_mappings || 0,
        mapped: stats.mapped || 0,
        unmapped: stats.unmapped || 0,
        currently_reading: parseInt(currentlyReadingResult.rows[0]?.count || '0'),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Audible Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
