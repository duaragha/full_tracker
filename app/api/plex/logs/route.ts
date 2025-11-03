import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// GET - Retrieve webhook logs
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status'); // success, failed, ignored, duplicate
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = `
      SELECT
        id,
        event_type,
        plex_rating_key,
        plex_title,
        plex_season,
        plex_episode,
        status,
        action_taken,
        error_message,
        processing_duration_ms,
        created_at
      FROM plex_webhook_logs
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM plex_webhook_logs';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    const countResult = await pool.query(
      countQuery,
      params.slice(0, params.length - 2)
    );
    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      logs: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('[Plex Logs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
