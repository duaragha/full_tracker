/**
 * GET /api/audible/config - Get Audible configuration
 * PUT /api/audible/config - Update Audible configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import type {
  GetAudibleConfigResponse,
  UpdateAudibleConfigRequest,
  UpdateAudibleConfigResponse,
} from '@/lib/types/audible';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(
      `SELECT
        email,
        country_code,
        enabled,
        auto_sync_progress,
        sync_interval_minutes,
        last_sync_at,
        token_expires_at
      FROM audible_config
      WHERE user_id = 1`
    );

    if (result.rows.length === 0) {
      return NextResponse.json<GetAudibleConfigResponse>({
        configured: false,
      });
    }

    const config = result.rows[0];

    return NextResponse.json<GetAudibleConfigResponse>({
      configured: true,
      config: {
        email: config.email,
        country_code: config.country_code,
        enabled: config.enabled,
        auto_sync_progress: config.auto_sync_progress,
        sync_interval_minutes: config.sync_interval_minutes,
        last_sync_at: config.last_sync_at?.toISOString() || null,
        token_expires_at: config.token_expires_at?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('[Audible Config GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: UpdateAudibleConfigRequest = await req.json();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.enabled !== undefined) {
      updates.push(`enabled = $${paramIndex}`);
      values.push(body.enabled);
      paramIndex++;
    }

    if (body.auto_sync_progress !== undefined) {
      updates.push(`auto_sync_progress = $${paramIndex}`);
      values.push(body.auto_sync_progress);
      paramIndex++;
    }

    if (body.sync_interval_minutes !== undefined) {
      if (body.sync_interval_minutes < 15) {
        return NextResponse.json<UpdateAudibleConfigResponse>(
          {
            success: false,
            message: 'Sync interval must be at least 15 minutes',
          },
          { status: 400 }
        );
      }

      updates.push(`sync_interval_minutes = $${paramIndex}`);
      values.push(body.sync_interval_minutes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json<UpdateAudibleConfigResponse>(
        {
          success: false,
          message: 'No fields to update',
        },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(1); // user_id

    const result = await pool.query(
      `UPDATE audible_config
       SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json<UpdateAudibleConfigResponse>(
        {
          success: false,
          message: 'Configuration not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<UpdateAudibleConfigResponse>({
      success: true,
      message: 'Configuration updated successfully',
      config: result.rows[0],
    });
  } catch (error) {
    console.error('[Audible Config PUT] Error:', error);
    return NextResponse.json<UpdateAudibleConfigResponse>(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
