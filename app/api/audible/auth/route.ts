/**
 * POST /api/audible/auth
 *
 * Authenticate with Audible and store encrypted credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { AudibleApiService } from '@/lib/services/audible-api-service';
import { EncryptionService } from '@/lib/services/encryption-service';
import type { AuthenticateAudibleRequest, AuthenticateAudibleResponse } from '@/lib/types/audible';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

export async function POST(req: NextRequest) {
  try {
    const body: AuthenticateAudibleRequest = await req.json();
    const { email, password, country_code } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json<AuthenticateAudibleResponse>(
        {
          success: false,
          message: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    // Authenticate with Audible via Python service
    const authResponse = await AudibleApiService.authenticate(
      email,
      password,
      country_code || 'us'
    );

    if (!authResponse.success) {
      return NextResponse.json<AuthenticateAudibleResponse>(
        {
          success: false,
          message: authResponse.error || 'Authentication failed',
          error: authResponse.error,
        },
        { status: 401 }
      );
    }

    // The tokens from Python service are already encrypted
    // Store in database
    const result = await pool.query(
      `INSERT INTO audible_config (
        user_id, email, country_code,
        access_token, refresh_token, device_serial,
        token_expires_at, last_auth_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        country_code = EXCLUDED.country_code,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        device_serial = EXCLUDED.device_serial,
        token_expires_at = EXCLUDED.token_expires_at,
        last_auth_at = NOW(),
        enabled = true
      RETURNING id`,
      [
        1, // user_id (hardcoded for now)
        email,
        country_code || 'us',
        authResponse.access_token,
        authResponse.refresh_token,
        authResponse.device_serial,
        authResponse.expires_at,
      ]
    );

    return NextResponse.json<AuthenticateAudibleResponse>({
      success: true,
      message: 'Successfully authenticated with Audible',
      config_id: result.rows[0].id,
    });
  } catch (error) {
    console.error('[Audible Auth] Error:', error);
    return NextResponse.json<AuthenticateAudibleResponse>(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
