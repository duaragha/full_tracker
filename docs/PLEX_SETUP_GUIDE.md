# Plex Integration Setup Guide

This guide walks through setting up Plex integration for automatic TV show tracking.

---

## Overview

Once configured, the Plex integration will:
- Automatically detect when you watch an episode on Plex
- Mark that episode as watched in your tracker
- Optionally auto-add new shows you start watching on Plex
- Match shows intelligently using TMDB/TVDB/IMDB IDs

**Important**: This is a **one-way sync** (Plex → Tracker only). Changes in the tracker won't sync back to Plex.

---

## Prerequisites

1. **Plex Media Server** running and accessible
2. **TV shows** in your Plex library
3. **Public domain** or **ngrok tunnel** for webhook endpoint (if Plex server is not on same network)

---

## Step 1: Generate Encryption Key

The encryption key is used to securely store your Plex token in the database.

### Option A: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option B: Using OpenSSL
```bash
openssl rand -hex 32
```

### Add to .env.local
```bash
# Add this line to /home/ragha/dev/projects/full_tracker/.env.local
ENCRYPTION_KEY=<your-64-character-hex-string>
```

**Security Warning**: Never commit this key to version control. It should only exist in your `.env.local` file.

---

## Step 2: Run Database Migration

Apply the Plex integration database schema:

```bash
# From project root
cd /home/ragha/dev/projects/full_tracker

# Run migration
psql $DATABASE_URL -f db/migrations/020_add_plex_integration.sql
```

**Verify migration:**
```bash
psql $DATABASE_URL -c "SELECT * FROM plex_sync_stats;"
```

You should see a table with columns like `total_mappings`, `mapped`, `unmapped`, etc.

---

## Step 3: Get Your Plex Token

Your Plex token is required for API access. Here's how to find it:

### Method 1: From Plex Web App (Easiest)

1. Open Plex Web App in your browser
2. Navigate to any TV show or movie
3. Click the **"..."** menu → **"Get Info"**
4. Click **"View XML"**
5. In the URL bar, look for `X-Plex-Token=XXXXXXXX`
6. Copy everything after `X-Plex-Token=` (before the next `&`)

### Method 2: From Plex Settings

1. Open Plex Settings
2. Go to **"Account"**
3. At the bottom of the page, you'll see your **Plex Token**

### Example
```
URL: https://app.plex.tv/desktop/#!/server/.../details?key=/library/metadata/12345&X-Plex-Token=abc123xyz789
                                                                                    ^^^^^^^^^^^^^^^^
Token: abc123xyz789
```

---

## Step 4: Configure Plex Integration in Tracker App

1. **Start your app** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to Plex Settings**:
   ```
   http://localhost:3000/settings/plex
   ```

3. **Enter your Plex token** (from Step 3)

4. **Configure options**:
   - **Auto-add shows**: Automatically add new shows to tracker when you watch them on Plex
   - **Auto-mark watched**: Automatically mark episodes as watched

5. **Click "Save Configuration"**

6. **Copy the webhook URL** displayed (e.g., `https://yourdomain.com/api/plex/webhook?secret=abc123...`)

---

## Step 5: Configure Plex Webhook

Plex webhooks send notifications when you watch media.

### Add Webhook to Plex

1. **Log into Plex** (web app or server settings)
2. Go to **Settings → Account → Webhooks**
3. Click **"Add Webhook"**
4. Paste the webhook URL from Step 4
5. Click **"Save Changes"**

### Test Webhook

1. **Watch any episode** on Plex
2. **Check tracker app** to see if episode was marked as watched
3. **Check webhook logs** in Settings → Plex → Activity Log

---

## Step 6: Resolve Any Conflicts

If a show can't be automatically matched, you'll see it in the **Conflicts** section.

### Resolve a Conflict

1. Go to **Settings → Plex → Conflicts**
2. For each conflict, you'll see:
   - Plex show title and year
   - Potential matches from your tracker
3. Select the correct match or create a new show
4. Click **"Confirm"**

### Conflict Types

- **Multiple Matches**: Plex show matches multiple shows in tracker (e.g., "The Office" US vs UK)
- **No Match**: Plex show not found in tracker
- **Ambiguous**: Low confidence match (< 90%)

---

## Troubleshooting

### Webhooks Not Received

**Check if webhook URL is accessible:**
```bash
curl -X POST https://yourdomain.com/api/plex/webhook?secret=YOUR_SECRET \
  -H "Content-Type: multipart/form-data" \
  -F 'payload={"event":"media.scrobble","Metadata":{"type":"episode"}}'
```

**Common issues:**
- Webhook URL not publicly accessible (use ngrok for local development)
- Firewall blocking incoming requests
- Incorrect secret in webhook URL

**Solution for local development (ngrok):**
```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Start tunnel
ngrok http 3000

# Use the https URL in Plex webhook settings
# Example: https://abc123.ngrok.io/api/plex/webhook?secret=...
```

### Episodes Not Marked as Watched

**Check webhook logs:**
```sql
SELECT * FROM plex_webhook_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Common issues:**
- Show not mapped (check `plex_show_mappings`)
- Episode doesn't exist in show's season data
- Webhook processed but episode already watched

**Manual resolution:**
1. Check if show exists: `SELECT * FROM tvshows WHERE title ILIKE '%show name%';`
2. Check mapping: `SELECT * FROM plex_show_mappings WHERE plex_title ILIKE '%show name%';`
3. Create manual mapping if needed

### Show Not Auto-Added

**Check if auto-add is enabled:**
```sql
SELECT auto_add_shows FROM plex_config WHERE user_id = 1;
```

**Check for conflicts:**
```sql
SELECT * FROM plex_conflicts WHERE resolved = false;
```

**Manual steps:**
1. Add show manually in tracker first
2. Watch an episode on Plex
3. Webhook will create mapping automatically

### Database Connection Issues

**Verify DATABASE_URL:**
```bash
echo $DATABASE_URL
```

**Test connection:**
```bash
psql $DATABASE_URL -c "SELECT 1;"
```

---

## Advanced Configuration

### Webhook Secret Rotation

To rotate your webhook secret (for security):

```sql
-- Generate new secret
UPDATE plex_config
SET webhook_secret = encode(gen_random_bytes(32), 'hex'),
    updated_at = NOW()
WHERE user_id = 1
RETURNING webhook_secret;
```

Then update the webhook URL in Plex settings.

### Disable Sync for Specific Shows

```sql
-- Disable sync for a show
UPDATE plex_show_mappings
SET sync_enabled = false
WHERE plex_title = 'Show Name';
```

### Manual Mapping

If auto-matching fails, create a manual mapping:

```sql
-- Find your show ID in tracker
SELECT id, title, tmdb_id FROM tvshows WHERE title ILIKE '%The Office%';

-- Create mapping (use Plex rating key from webhook logs)
INSERT INTO plex_show_mappings (
  plex_rating_key,
  plex_guid,
  plex_title,
  plex_year,
  tmdb_id,
  tvshow_id,
  match_confidence,
  match_method,
  manually_confirmed
) VALUES (
  '12343',  -- from Plex
  'com.plexapp.agents.themoviedb://1418',
  'The Office',
  2005,
  1418,
  42,  -- your tvshow ID
  1.0,
  'manual',
  true
);
```

### Bulk Sync Historical Data

**Warning**: This is advanced and NOT recommended for initial setup.

If you want to sync all historical watch data from Plex (not just new watches):

```typescript
// This would require additional implementation
// See PLEX_INTEGRATION_ARCHITECTURE.md for PlexEpisodeService.syncShowProgress()
```

### Monitor Webhook Activity

```sql
-- Last 24 hours activity
SELECT
  event_type,
  status,
  COUNT(*) as count,
  AVG(processing_duration_ms) as avg_duration
FROM plex_webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, status
ORDER BY count DESC;

-- Failed webhooks
SELECT
  plex_title,
  error_message,
  created_at
FROM plex_webhook_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## Maintenance

### Clean Old Webhook Logs

Webhook logs can grow large over time. Clean logs older than 90 days:

```sql
SELECT cleanup_old_webhook_logs();
```

**Schedule as cron job** (optional):
```bash
# Add to crontab
0 2 * * 0 psql $DATABASE_URL -c "SELECT cleanup_old_webhook_logs();" > /dev/null 2>&1
```

### Backup Configuration

```sql
-- Export Plex config
\copy (SELECT * FROM plex_config) TO '/tmp/plex_config_backup.csv' CSV HEADER;

-- Export mappings
\copy (SELECT * FROM plex_show_mappings) TO '/tmp/plex_mappings_backup.csv' CSV HEADER;
```

---

## Security Best Practices

1. **Never commit** `.env.local` to version control
2. **Rotate encryption key** if compromised
3. **Use HTTPS** for webhook endpoint (required in production)
4. **Regularly review** webhook logs for suspicious activity
5. **Limit webhook access** with firewall rules if possible
6. **Monitor failed webhooks** for potential attacks

---

## Uninstalling

To completely remove Plex integration:

```sql
-- Disable integration
UPDATE plex_config SET enabled = false WHERE user_id = 1;

-- Remove webhook from Plex settings (manual step)

-- Optional: Drop all Plex tables (destructive!)
DROP TABLE IF EXISTS plex_webhook_logs CASCADE;
DROP TABLE IF EXISTS plex_conflicts CASCADE;
DROP TABLE IF EXISTS plex_show_mappings CASCADE;
DROP TABLE IF EXISTS plex_config CASCADE;

-- Remove columns from tvshows
ALTER TABLE tvshows
  DROP COLUMN IF EXISTS plex_synced,
  DROP COLUMN IF EXISTS plex_last_sync,
  DROP COLUMN IF EXISTS source;
```

---

## FAQ

### Q: Will this work with Plex hosted on my local network?
**A**: Yes, but your webhook endpoint must be publicly accessible. Use ngrok for local development.

### Q: Can I sync multiple Plex users?
**A**: Not currently supported. This is a single-user integration. See architecture doc for multi-user future enhancement.

### Q: What happens if I manually mark an episode as watched before the webhook arrives?
**A**: The webhook will detect the episode is already watched and skip it, preserving your manual watch date.

### Q: Can I sync watch status back to Plex?
**A**: No, this is a one-way sync (Plex → Tracker). Two-way sync is a potential future enhancement.

### Q: Does this work with movies?
**A**: Currently TV shows only. Movie support could be added following the same architecture.

### Q: What external APIs does this use?
**A**: TMDB API (already used by your app) for ID conversion and metadata. No additional API keys needed.

### Q: How much does this cost?
**A**: Free! No additional services required. TMDB API is free for non-commercial use.

---

## Support

If you encounter issues:

1. Check webhook logs: `SELECT * FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 20;`
2. Check conflicts: `SELECT * FROM plex_conflicts WHERE resolved = false;`
3. Check mappings: `SELECT * FROM plex_show_mappings;`
4. Review architecture doc: `/home/ragha/dev/projects/full_tracker/docs/PLEX_INTEGRATION_ARCHITECTURE.md`

---

## Next Steps

After setup is complete:

1. Watch an episode on Plex to test
2. Verify episode marked as watched in tracker
3. Review webhook logs to ensure no errors
4. Resolve any pending conflicts
5. Enjoy automated tracking!
