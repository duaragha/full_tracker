# Plex Integration - Quick Start Guide

**Goal**: Get basic Plex integration working in under 30 minutes.

---

## Step 1: Database Setup (5 minutes)

```bash
# Navigate to project
cd /home/ragha/dev/projects/full_tracker

# Generate encryption key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Add to .env.local
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.local

# Run migration
psql $DATABASE_URL -f db/migrations/020_add_plex_integration.sql

# Verify
psql $DATABASE_URL -c "SELECT * FROM plex_sync_stats;"
```

**Expected output**: Table with all zeros (no data yet).

---

## Step 2: Implement Webhook Endpoint (10 minutes)

Create `/home/ragha/dev/projects/full_tracker/app/api/plex/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

export async function POST(req: NextRequest) {
  try {
    // 1. Get webhook secret from URL
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get('secret');

    // 2. Get configured secret from database
    const configResult = await pool.query(
      'SELECT webhook_secret, enabled FROM plex_config WHERE user_id = 1'
    );

    if (configResult.rows.length === 0) {
      return NextResponse.json({ error: 'Plex not configured' }, { status: 401 });
    }

    const { webhook_secret, enabled } = configResult.rows[0];

    // 3. Verify secret
    if (providedSecret !== webhook_secret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (!enabled) {
      return NextResponse.json({ error: 'Plex integration disabled' }, { status: 403 });
    }

    // 4. Parse multipart form-data
    const formData = await req.formData();
    const payloadString = formData.get('payload') as string;

    if (!payloadString) {
      return NextResponse.json({ error: 'No payload' }, { status: 400 });
    }

    const payload = JSON.parse(payloadString);

    // 5. Only process scrobble events for TV episodes
    if (payload.event !== 'media.scrobble') {
      return NextResponse.json({ status: 'ignored', reason: 'Event type not supported' });
    }

    if (payload.Metadata.type !== 'episode') {
      return NextResponse.json({ status: 'ignored', reason: 'Not an episode' });
    }

    // 6. Log the webhook (minimal version)
    await pool.query(
      `INSERT INTO plex_webhook_logs (
        event_type, plex_rating_key, plex_title, plex_season, plex_episode,
        payload, status, action_taken
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        payload.event,
        payload.Metadata.grandparentRatingKey,
        payload.Metadata.grandparentTitle,
        payload.Metadata.parentIndex,
        payload.Metadata.index,
        JSON.stringify(payload),
        'success',
        'logged'
      ]
    );

    console.log('[Plex Webhook] Received:', {
      show: payload.Metadata.grandparentTitle,
      season: payload.Metadata.parentIndex,
      episode: payload.Metadata.index,
    });

    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('[Plex Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Step 3: Implement Config Endpoint (10 minutes)

Create `/home/ragha/dev/projects/full_tracker/app/api/plex/config/route.ts`:

```typescript
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
```

---

## Step 4: Basic Settings Page (5 minutes)

Create `/home/ragha/dev/projects/full_tracker/app/settings/plex/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function PlexSettingsPage() {
  const [token, setToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/plex/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plexToken: token }),
      });

      const data = await response.json();

      if (response.ok) {
        setWebhookUrl(data.webhookUrl);
        setMessage('Configuration saved successfully!');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Plex Integration</CardTitle>
          <CardDescription>
            Connect your Plex server to automatically sync watch history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="token">Plex Token</Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Plex token"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Find your token in Plex Web App URL when viewing any media
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading || !token}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>

          {message && (
            <div className={`p-3 rounded ${message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {message}
            </div>
          )}

          {webhookUrl && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium mb-2">Webhook URL:</p>
              <code className="text-sm bg-background p-2 rounded block break-all">
                {webhookUrl}
              </code>
              <p className="text-sm text-muted-foreground mt-2">
                Add this URL in Plex: Settings → Account → Webhooks
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Step 5: Test It! (5 minutes)

### Start Dev Server
```bash
npm run dev
```

### Configure Plex

1. **Navigate to settings page**: http://localhost:3000/settings/plex

2. **Get your Plex token**:
   - Open Plex Web App
   - Play any media
   - Click "..." → "Get Info" → "View XML"
   - Copy token from URL: `X-Plex-Token=YOUR_TOKEN_HERE`

3. **Save configuration**:
   - Paste token in settings page
   - Click "Save Configuration"
   - Copy the webhook URL shown

4. **Add webhook to Plex**:
   - Log into Plex Web App
   - Settings → Account → Webhooks
   - Click "Add Webhook"
   - Paste the webhook URL
   - Save

### Test Webhook

1. **Watch any episode on Plex** (mark as played)

2. **Check webhook logs**:
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 5;"
   ```

3. **Expected result**: You should see a new row with the episode info

---

## Troubleshooting

### Webhook not received?

**Local development**: Use ngrok to expose localhost
```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Start tunnel
ngrok http 3000

# Use the https URL in your webhook URL
# Example: https://abc123.ngrok.io/api/plex/webhook?secret=...
```

### Check logs
```bash
# Server logs
npm run dev

# Database logs
psql $DATABASE_URL -c "SELECT event_type, plex_title, status, created_at FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 10;"
```

---

## Next Steps

You now have a basic working webhook that logs all scrobble events. To add full functionality:

1. **Implement matching** (Phase 2):
   - Create `PlexMatchingService` to match Plex shows to tracker shows
   - Extract TMDB ID from Plex GUID
   - Query tracker database

2. **Implement episode marking** (Phase 3):
   - Create `PlexEpisodeService` to mark episodes as watched
   - Update tvshows table seasons JSON

3. **Add conflict resolution UI** (Phase 4):
   - Create conflicts endpoint
   - Build UI to resolve ambiguous matches

4. **Full implementation**: Follow the complete checklist in `PLEX_IMPLEMENTATION_CHECKLIST.md`

---

## What You Have Now

✅ Database schema created
✅ Encryption service implemented
✅ Webhook endpoint receiving events
✅ Config endpoint saving Plex token
✅ Basic settings UI
✅ Webhook logs in database

## What's Next

⬜ Show matching logic
⬜ Episode marking logic
⬜ Conflict resolution
⬜ Full UI with logs and mappings

---

## Files Created

All files are ready in your project:

- ✅ `/home/ragha/dev/projects/full_tracker/db/migrations/020_add_plex_integration.sql`
- ✅ `/home/ragha/dev/projects/full_tracker/types/plex.ts`
- ✅ `/home/ragha/dev/projects/full_tracker/lib/services/encryption-service.ts`
- ⬜ `/home/ragha/dev/projects/full_tracker/app/api/plex/webhook/route.ts` (create from step 2)
- ⬜ `/home/ragha/dev/projects/full_tracker/app/api/plex/config/route.ts` (create from step 3)
- ⬜ `/home/ragha/dev/projects/full_tracker/app/settings/plex/page.tsx` (create from step 4)

---

## Resources

- **Full Architecture**: `docs/PLEX_INTEGRATION_ARCHITECTURE.md`
- **Setup Guide**: `docs/PLEX_SETUP_GUIDE.md`
- **Implementation Checklist**: `docs/PLEX_IMPLEMENTATION_CHECKLIST.md`
- **Visual Diagrams**: `docs/PLEX_ARCHITECTURE_DIAGRAM.md`

---

**Time to working webhook**: ~30 minutes
**Time to full implementation**: ~2-3 weeks (following checklist)

Good luck! 🚀
