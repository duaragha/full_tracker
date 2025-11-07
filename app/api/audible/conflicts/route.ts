/**
 * GET /api/audible/conflicts
 *
 * Get unresolved Audible conflicts
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import type { GetAudibleConflictsResponse } from '@/lib/types/audible';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolvedParam = searchParams.get('resolved');
    const showResolved = resolvedParam === 'true';

    const result = await pool.query(
      `SELECT
        id,
        asin,
        audible_title,
        audible_author,
        conflict_type,
        potential_matches,
        created_at
       FROM audible_conflicts
       WHERE resolved = $1
       ORDER BY created_at DESC`,
      [showResolved]
    );

    const conflicts = result.rows.map((row) => ({
      id: row.id,
      asin: row.asin,
      audible_title: row.audible_title,
      audible_author: row.audible_author,
      conflict_type: row.conflict_type,
      potential_matches: row.potential_matches || [],
      created_at: row.created_at.toISOString(),
    }));

    return NextResponse.json<GetAudibleConflictsResponse>({
      conflicts,
      total: conflicts.length,
    });
  } catch (error) {
    console.error('[Audible Conflicts] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
