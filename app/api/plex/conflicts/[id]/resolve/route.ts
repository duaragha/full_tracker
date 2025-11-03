import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// POST - Resolve a conflict
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, tvshowId } = body;
    const conflictId = parseInt(params.id);

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Get conflict details
    const conflictResult = await pool.query(
      'SELECT * FROM plex_conflicts WHERE id = $1',
      [conflictId]
    );

    if (conflictResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 }
      );
    }

    const conflict = conflictResult.rows[0];

    if (action === 'select' && tvshowId) {
      // User selected a specific show
      await pool.query('BEGIN');

      try {
        // Create mapping
        await pool.query(
          `INSERT INTO plex_show_mappings (
            plex_rating_key, plex_guid, plex_title, plex_year,
            tvshow_id,
            match_confidence, match_method, manually_confirmed, sync_enabled
          ) VALUES ($1, $2, $3, $4, $5, 1.0, 'manual', true, true)
          ON CONFLICT (plex_rating_key) DO UPDATE SET
            tvshow_id = $5,
            match_confidence = 1.0,
            match_method = 'manual',
            manually_confirmed = true,
            updated_at = NOW()`,
          [
            conflict.plex_rating_key,
            conflict.plex_guid,
            conflict.plex_title,
            conflict.plex_year,
            tvshowId,
          ]
        );

        // Mark conflict as resolved
        await pool.query(
          `UPDATE plex_conflicts
           SET resolved = true,
               resolved_at = NOW(),
               resolved_tvshow_id = $1,
               resolution_action = 'selected'
           WHERE id = $2`,
          [tvshowId, conflictId]
        );

        await pool.query('COMMIT');

        return NextResponse.json({
          success: true,
          action: 'selected',
          tvshowId,
        });

      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }

    } else if (action === 'create_new') {
      // User wants to create a new show
      // This would require additional implementation to create a new show
      // For now, just mark as resolved with a note

      await pool.query(
        `UPDATE plex_conflicts
         SET resolved = true,
             resolved_at = NOW(),
             resolution_action = 'create_new'
         WHERE id = $1`,
        [conflictId]
      );

      return NextResponse.json({
        success: true,
        action: 'create_new',
        message: 'Please add the show manually in the tracker, then it will auto-map',
      });

    } else if (action === 'ignore') {
      // User wants to ignore this show

      await pool.query(
        `UPDATE plex_conflicts
         SET resolved = true,
             resolved_at = NOW(),
             resolution_action = 'ignored'
         WHERE id = $1`,
        [conflictId]
      );

      return NextResponse.json({
        success: true,
        action: 'ignored',
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[Plex Conflicts Resolve API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 }
    );
  }
}
