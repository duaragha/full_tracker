/**
 * Audible Sync Cron Job
 *
 * This script is designed to run on Railway as a scheduled cron job.
 * It triggers Audible library sync at regular intervals.
 *
 * Railway Cron Setup:
 * 1. Create new service in Railway
 * 2. Set start command: npx tsx scripts/audible-sync-cron.ts
 * 3. Add cron schedule in Railway settings: "*/5 * * * *" for every 5 minutes
 * 4. Add same environment variables as main app
 *
 * Alternative: Vercel Cron
 * Create /app/api/cron/audible-sync/route.ts and add to vercel.json
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function runSync() {
  console.log('[Audible Cron] Starting scheduled sync...');

  try {
    // Check if auto-sync is enabled
    const configResult = await pool.query(
      'SELECT enabled, auto_sync_progress FROM audible_config WHERE user_id = 1'
    );

    if (configResult.rows.length === 0) {
      console.log('[Audible Cron] No configuration found, skipping sync');
      return;
    }

    const config = configResult.rows[0];

    if (!config.enabled || !config.auto_sync_progress) {
      console.log('[Audible Cron] Auto-sync is disabled, skipping');
      return;
    }

    // Trigger sync via API endpoint
    const response = await fetch(`${API_BASE_URL}/api/audible/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force: false }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('[Audible Cron] Sync completed:', {
        status: result.status,
        books_synced: result.books_synced,
        books_updated: result.books_updated,
        new_mappings: result.new_mappings,
        conflicts: result.conflicts,
        duration_ms: result.duration_ms,
      });
    } else {
      console.error('[Audible Cron] Sync failed:', result);
    }
  } catch (error) {
    console.error('[Audible Cron] Error:', error);
  } finally {
    await pool.end();
  }
}

// Run sync
runSync();
