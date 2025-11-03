# Plex Webhook Troubleshooting Guide

Quick reference for diagnosing and fixing Plex webhook issues.

---

## Quick Diagnostic

Run this one-liner to check everything:
```bash
node test-webhook-simple.js
```

This will show you:
- ✓/✗ Database connection
- ✓/✗ Plex configuration
- Number of webhook logs (should increase when you mark episodes watched)
- Number of show mappings
- Number of conflicts

---

## Common Issues

### Issue 1: "No webhooks received from Plex"

**Symptoms**:
- `plex_webhook_logs` table is empty
- `last_webhook_received` is NULL in plex_config
- Episodes marked in Plex don't update tracker

**Diagnosis**:
```bash
# Check if any webhooks received
source .env.local
psql "$POSTGRES_URL" -c "SELECT COUNT(*) FROM plex_webhook_logs;"
# Should be > 0 if webhooks working
```

**Causes & Solutions**:

1. **Server not running**
   ```bash
   # Start server
   npm run dev
   ```

2. **Webhook URL not accessible** (MOST COMMON)
   - localhost URLs don't work from Plex
   - **Solution**: Use ngrok
   ```bash
   # Install ngrok from https://ngrok.com
   ngrok http 3000

   # Copy the https URL (e.g., https://abc123.ngrok.io)
   # Update webhook in Plex to:
   # https://abc123.ngrok.io/api/plex/webhook?secret=YOUR_SECRET
   ```

3. **Webhook not configured in Plex**
   - Go to: Plex Web App → Settings → Account → Webhooks
   - Add webhook URL (get from database):
   ```bash
   source .env.local
   SECRET=$(psql "$POSTGRES_URL" -t -c "SELECT webhook_secret FROM plex_config WHERE user_id = 1;" | xargs)
   echo "http://localhost:3000/api/plex/webhook?secret=$SECRET"
   # For production, replace localhost:3000 with your domain
   ```

4. **Plex Pass not active**
   - Webhooks require Plex Pass subscription
   - Check: Plex → Settings → Account → Subscription Status

---

### Issue 2: "Webhooks received but episodes not marked watched"

**Symptoms**:
- Webhooks appear in `plex_webhook_logs`
- Episodes still show as unwatched in tracker
- action_taken = 'conflict_created' or 'episode_mark_failed'

**Diagnosis**:
```bash
# Check recent webhook logs
source .env.local
psql "$POSTGRES_URL" -c "
  SELECT id, plex_title, plex_season, plex_episode, status, action_taken, error_message
  FROM plex_webhook_logs
  ORDER BY created_at DESC
  LIMIT 10;
"
```

**Look for**:
- `status = 'failed'` → Check error_message
- `action_taken = 'conflict_created'` → Show not matched
- `action_taken = 'episode_mark_failed'` → Episode not found

**Solutions**:

1. **Show not in tracker** (conflict_created)
   ```bash
   # Check conflicts
   psql "$POSTGRES_URL" -c "
     SELECT id, plex_title, conflict_type
     FROM plex_conflicts
     WHERE resolved = false;
   "
   ```
   - **Solution**: Add the show to your tracker first, or resolve conflict in UI

2. **Episode not in show data** (episode_mark_failed)
   ```bash
   # Check if show exists
   psql "$POSTGRES_URL" -c "
     SELECT id, title, seasons
     FROM tvshows
     WHERE title ILIKE '%Your Show Name%';
   "
   ```
   - **Solution**: Ensure show has season/episode data from TMDB

3. **Auto-mark disabled**
   ```bash
   # Check config
   psql "$POSTGRES_URL" -c "
     SELECT auto_mark_watched
     FROM plex_config
     WHERE user_id = 1;
   "
   ```
   - **Solution**: Enable auto_mark_watched in settings

---

### Issue 3: "Wrong episode marked as watched"

**Symptoms**:
- Different episode than expected is marked watched
- Season/episode numbers don't match

**Diagnosis**:
```bash
# Check recent webhook for season/episode numbers
psql "$POSTGRES_URL" -c "
  SELECT plex_title, plex_season, plex_episode, payload->>'Metadata'
  FROM plex_webhook_logs
  ORDER BY created_at DESC
  LIMIT 1;
"
```

**Causes**:
1. **Plex and TMDB numbering differ**
   - Specials (Season 0) often mismatch
   - Some shows have different episode ordering

2. **Wrong show matched**
   - Check show mapping:
   ```bash
   psql "$POSTGRES_URL" -c "
     SELECT plex_title, tvshow_id, match_method, match_confidence
     FROM plex_show_mappings;
   "
   ```

**Solution**: Manually verify show mappings

---

### Issue 4: "401 Unauthorized" errors

**Symptoms**:
- Webhooks return 401 status
- Server logs show "Invalid webhook secret"

**Diagnosis**:
```bash
# Get correct webhook URL with secret
source .env.local
SECRET=$(psql "$POSTGRES_URL" -t -c "SELECT webhook_secret FROM plex_config WHERE user_id = 1;" | xargs)
echo "Correct URL: http://localhost:3000/api/plex/webhook?secret=$SECRET"
```

**Solution**: Update webhook URL in Plex with correct secret

---

### Issue 5: "500 Internal Server Error"

**Symptoms**:
- Webhooks return 500 status
- error_message in plex_webhook_logs

**Diagnosis**:
```bash
# Check error messages
psql "$POSTGRES_URL" -c "
  SELECT id, plex_title, error_message, created_at
  FROM plex_webhook_logs
  WHERE status = 'failed'
  ORDER BY created_at DESC
  LIMIT 10;
"
```

**Common Causes**:

1. **Database connection failed**
   - Check DATABASE_URL in .env.local
   - Test connection:
   ```bash
   psql "$POSTGRES_URL" -c "SELECT 1;"
   ```

2. **TMDB API key missing**
   - Required for show matching
   ```bash
   grep NEXT_PUBLIC_TMDB_API_KEY .env.local
   ```

3. **Invalid JSON in seasons data**
   - Check show data:
   ```bash
   psql "$POSTGRES_URL" -c "
     SELECT id, title, seasons
     FROM tvshows
     WHERE seasons IS NOT NULL
     LIMIT 1;
   "
   ```

---

## Test Procedures

### Test 1: End-to-End Webhook Test

**Prerequisites**:
- Server running
- ngrok tunnel active (for local dev)
- Webhook configured in Plex

**Steps**:
1. Note current webhook count:
   ```bash
   psql "$POSTGRES_URL" -c "SELECT COUNT(*) FROM plex_webhook_logs;"
   ```

2. In Plex, mark any TV episode as "watched" (click checkmark)

3. Within 2-3 seconds, check for new webhook:
   ```bash
   psql "$POSTGRES_URL" -c "
     SELECT id, plex_title, plex_season, plex_episode, status, action_taken, created_at
     FROM plex_webhook_logs
     ORDER BY created_at DESC
     LIMIT 1;
   "
   ```

4. Check server logs for:
   ```
   [Plex Webhook] Processed: { status: 'success', action: 'marked_watched', ... }
   ```

**Expected Result**: New row in plex_webhook_logs with status='success'

---

### Test 2: Manual Webhook Simulation

**When to use**: Server running, want to test without Plex

**Run**:
```bash
./test-webhook-live.sh
```

**This tests**:
- ✓ Endpoint responds
- ✓ Authentication works
- ✓ Show matching works
- ✓ Conflict creation works
- ✓ Event filtering works

---

### Test 3: Database Diagnostics

**When to use**: Troubleshoot without server

**Run**:
```bash
node test-webhook-simple.js
```

**This checks**:
- ✓ Database connection
- ✓ Configuration
- ✓ Tables exist
- ✓ Webhook logs
- ✓ Show mappings
- ✓ Conflicts

---

## Monitoring Dashboard

### Check Webhook Activity (Last 24 Hours)
```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'ignored') as ignored
FROM plex_webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Check Show Mapping Statistics
```sql
SELECT
  COUNT(*) as total_mappings,
  COUNT(*) FILTER (WHERE tvshow_id IS NOT NULL) as mapped,
  COUNT(*) FILTER (WHERE tvshow_id IS NULL) as unmapped,
  COUNT(*) FILTER (WHERE match_confidence >= 0.90) as high_confidence,
  COUNT(*) FILTER (WHERE match_confidence < 0.90) as low_confidence
FROM plex_show_mappings;
```

### Check Recent Failures
```sql
SELECT
  id,
  plex_title,
  plex_season,
  plex_episode,
  error_message,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as when
FROM plex_webhook_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Replace localhost with production domain in PUBLIC_WEBHOOK_URL
- [ ] Ensure HTTPS is enabled (required by Plex for security)
- [ ] Set up webhook secret rotation mechanism
- [ ] Configure rate limiting (currently 100 req/min)
- [ ] Set up monitoring/alerting for webhook failures
- [ ] Test webhook with various show types
- [ ] Document conflict resolution process for users
- [ ] Set up automated cleanup of old webhook logs (90 days)
- [ ] Configure backup for plex_show_mappings table
- [ ] Test TMDB API rate limits and error handling

---

## Getting Help

### Server Logs
```bash
# Watch server logs in real-time
npm run dev | grep -i plex
```

### Database Logs
```bash
# Enable query logging (optional)
psql "$POSTGRES_URL" -c "SET log_statement = 'all';"
```

### Debug Mode
Add to server logs:
```typescript
console.log('[DEBUG] Webhook payload:', JSON.stringify(payload, null, 2));
```

---

## Quick Reference

### Important Tables
- `plex_config` - Configuration and webhook secret
- `plex_webhook_logs` - All webhook events (audit log)
- `plex_show_mappings` - Plex show → tracker show mappings
- `plex_conflicts` - Shows needing manual resolution

### Important Services
- `PlexWebhookService` - Main webhook processor
- `PlexMatchingService` - Show matching logic
- `PlexEpisodeService` - Episode marking logic

### Environment Variables
- `DATABASE_URL` or `POSTGRES_URL` - Database connection
- `NEXT_PUBLIC_TMDB_API_KEY` - TMDB API (for matching)
- `PUBLIC_WEBHOOK_URL` - Base URL for webhooks
- `ENCRYPTION_KEY` - For encrypting Plex token

---

**Last Updated**: 2025-11-03
**Next Review**: After first successful webhook
