import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// GET - List all show mappings
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const unmappedOnly = url.searchParams.get('unmapped') === 'true';
    const conflictsOnly = url.searchParams.get('conflicts') === 'true';

    if (unmappedOnly) {
      // Get shows from Plex that don't have mappings
      const result = await pool.query(`
        SELECT * FROM plex_unmapped_shows
        ORDER BY last_seen DESC
      `);

      return NextResponse.json({ mappings: result.rows });
    }

    if (conflictsOnly) {
      // Get shows with conflicts
      const result = await pool.query(`
        SELECT * FROM plex_conflicts
        WHERE resolved = false
        ORDER BY created_at DESC
      `);

      return NextResponse.json({ mappings: result.rows });
    }

    // Get all mappings
    const result = await pool.query(`
      SELECT
        psm.*,
        t.title as tracker_title,
        t.first_aired
      FROM plex_show_mappings psm
      LEFT JOIN tvshows t ON psm.tvshow_id = t.id
      ORDER BY psm.created_at DESC
    `);

    return NextResponse.json({ mappings: result.rows });

  } catch (error) {
    console.error('[Plex Mappings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}
