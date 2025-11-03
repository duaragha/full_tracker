import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { EncryptionService } from '@/lib/services/encryption-service';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// GET - Retrieve config
export async function GET() {
  try {
    const result = await pool.query(
      'SELECT enabled, auto_add_shows, auto_mark_watched, plex_server_name, last_webhook_received FROM plex_config WHERE user_id = 1'
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        configured: false,
        enabled: false,
        autoAddShows: true,
        autoMarkWatched: true,
        webhookUrl: '',
      });
    }

    const config = result.rows[0];

    // Get webhook URL
    const secretResult = await pool.query(
      'SELECT webhook_secret FROM plex_config WHERE user_id = 1'
    );
    const webhookSecret = secretResult.rows[0]?.webhook_secret || '';
    const publicUrl = process.env.PUBLIC_WEBHOOK_URL || 'http://localhost:3000';
    const webhookUrl = `${publicUrl}/api/plex/webhook?secret=${webhookSecret}`;

    return NextResponse.json({
      configured: true,
      enabled: config.enabled,
      autoAddShows: config.auto_add_shows,
      autoMarkWatched: config.auto_mark_watched,
      serverName: config.plex_server_name,
      lastWebhookReceived: config.last_webhook_received,
      webhookUrl,
    });

  } catch (error) {
    console.error('[Plex Config] GET Error:', error);
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500 });
  }
}

// POST - Save config
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plexToken, autoAddShows = true, autoMarkWatched = true, enabled = true } = body;

    if (!plexToken) {
      return NextResponse.json({ error: 'Plex token required' }, { status: 400 });
    }

    // Encrypt token
    const encryptedToken = EncryptionService.encrypt(plexToken);

    // Generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // Save to database (upsert)
    await pool.query(
      `INSERT INTO plex_config (
        user_id, plex_token, webhook_secret, enabled, auto_add_shows, auto_mark_watched
      ) VALUES (1, $1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO UPDATE SET
        plex_token = $1,
        webhook_secret = $2,
        enabled = $3,
        auto_add_shows = $4,
        auto_mark_watched = $5,
        updated_at = NOW()`,
      [encryptedToken, webhookSecret, enabled, autoAddShows, autoMarkWatched]
    );

    const publicUrl = process.env.PUBLIC_WEBHOOK_URL || 'http://localhost:3000';
    const webhookUrl = `${publicUrl}/api/plex/webhook?secret=${webhookSecret}`;

    return NextResponse.json({
      success: true,
      webhookUrl,
    });

  } catch (error) {
    console.error('[Plex Config] POST Error:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
