import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { PlexWebhookService } from '@/lib/services/plex-webhook-service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Remove old timestamps
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  recentTimestamps.push(now);
  rateLimitMap.set(ip, recentTimestamps);
  return true;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // 2. Get webhook secret from URL
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get('secret');

    console.log('[Plex Webhook] Full URL:', req.url);
    console.log('[Plex Webhook] Provided secret:', providedSecret ? `${providedSecret.substring(0, 10)}...` : 'NONE');

    if (!providedSecret) {
      console.warn('[Plex Webhook] No secret in URL');
      return NextResponse.json(
        { error: 'Missing webhook secret' },
        { status: 401 }
      );
    }

    // 3. Get configured secret from database
    const configResult = await pool.query(
      'SELECT webhook_secret, enabled FROM plex_config WHERE user_id = 1'
    );

    if (configResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Plex not configured' },
        { status: 401 }
      );
    }

    const { webhook_secret, enabled } = configResult.rows[0];

    console.log('[Plex Webhook] Expected secret:', webhook_secret ? `${webhook_secret.substring(0, 10)}...` : 'NONE');
    console.log('[Plex Webhook] Secrets match:', providedSecret === webhook_secret);

    // 4. Verify secret
    if (providedSecret !== webhook_secret) {
      console.warn('[Plex Webhook] Invalid secret provided');
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    if (!enabled) {
      return NextResponse.json(
        { error: 'Plex integration disabled' },
        { status: 403 }
      );
    }

    // 5. Parse multipart form-data
    const formData = await req.formData();
    const payloadString = formData.get('payload') as string;

    if (!payloadString) {
      return NextResponse.json(
        { error: 'No payload in request' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(payloadString);

    // 6. Process webhook using PlexWebhookService
    const result = await PlexWebhookService.processWebhook(payload);

    // 7. Log processing info
    console.log('[Plex Webhook] Processed:', {
      status: result.status,
      action: result.action,
      duration: result.duration,
      show: payload.Metadata?.grandparentTitle || payload.Metadata?.title,
      season: payload.Metadata?.parentIndex,
      episode: payload.Metadata?.index,
    });

    // 8. Return response based on status
    if (result.status === 'failed') {
      return NextResponse.json(
        {
          status: 'failed',
          action: result.action,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: result.status,
      action: result.action,
      duration: result.duration,
    });

  } catch (error) {
    console.error('[Plex Webhook] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
