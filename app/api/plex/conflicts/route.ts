import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// GET - List all unresolved conflicts
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        plex_rating_key,
        plex_guid,
        plex_title,
        plex_year,
        conflict_type,
        potential_matches,
        created_at,
        updated_at
      FROM plex_conflicts
      WHERE resolved = false
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ conflicts: result.rows });

  } catch (error) {
    console.error('[Plex Conflicts API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conflicts' },
      { status: 500 }
    );
  }
}
