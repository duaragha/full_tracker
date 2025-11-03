# Plex Webhook Testing Guide

Quick guide for testing the Plex webhook integration with your real Plex server.

---

## Prerequisites

- ✓ Next.js server running (`npm run dev`)
- ✓ Database configured with Plex integration
- ✓ Webhook secret generated in database
- ✓ ngrok installed (for exposing localhost to Plex)

---

## Step 1: Get Your Webhook URL

### Find your webhook secret:
```bash
psql "$DATABASE_URL" -c "SELECT webhook_secret FROM plex_config WHERE user_id = 1;"
```

Copy the secret (it's already encrypted in the database).

---

## Step 2: Expose Local Server with ngrok

```bash
# Start ngrok to expose port 3000
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

Your webhook URL will be:
```
https://abc123.ngrok.io/api/plex/webhook?secret=YOUR_SECRET_HERE
```

---

## Step 3: Configure Plex Webhook

1. Go to https://app.plex.tv/desktop/#!/settings/webhooks
2. Click "Add Webhook"
3. Paste your webhook URL: `https://abc123.ngrok.io/api/plex/webhook?secret=YOUR_SECRET`
4. Click "Save Changes"

---

## Step 4: Test with Real Playback

1. Open Plex and start watching an episode of a TV show
2. Watch at least 90% of the episode (or skip to end)
3. Plex will send a `media.scrobble` webhook

---

## Step 5: Verify in Database

### Check webhook logs:
```bash
psql "$DATABASE_URL" -c "SELECT
  id,
  plex_title,
  CONCAT('S', LPAD(plex_season::text, 2, '0'), 'E', LPAD(plex_episode::text, 2, '0')) as episode,
  status,
  action_taken,
  created_at
FROM plex_webhook_logs
ORDER BY created_at DESC
LIMIT 5;"
```

### Check show mappings:
```bash
psql "$DATABASE_URL" -c "SELECT
  plex_title,
  match_method,
  match_confidence,
  sync_enabled
FROM plex_show_mappings
ORDER BY created_at DESC;"
```

### Check for conflicts:
```bash
psql "$DATABASE_URL" -c "SELECT
  id,
  plex_title,
  conflict_type,
  created_at
FROM plex_conflicts
WHERE resolved = false
ORDER BY created_at DESC;"
```

---

## Step 6: Monitor Server Logs

Watch the Next.js console for webhook processing logs:

```
[Plex Webhook] Full URL: https://abc123.ngrok.io/api/plex/webhook?secret=...
[Plex Webhook] Provided secret: d6ca3cf15...
[Plex Webhook] Secrets match: true
[Plex Webhook] Processed: {
  status: 'success',
  action: 'marked_watched',
  duration: 580,
  show: 'Breaking Bad',
  season: 1,
  episode: 1
}
```

---

## Troubleshooting

### Webhook not received
- ✓ Check ngrok is running and not expired
- ✓ Verify webhook URL in Plex settings
- ✓ Ensure secret is correct (no spaces, full string)
- ✓ Check Next.js server is running on port 3000

### Show not matching
- ✓ Check if show exists in tracker (`SELECT * FROM tvshows WHERE title ILIKE '%show name%'`)
- ✓ Look for conflicts in `plex_conflicts` table
- ✓ Verify TMDB ID in Plex matches tracker TMDB ID
- ✓ If no match, add show to tracker first

### Episode not marking as watched
- ✓ Check show mapping exists (`SELECT * FROM plex_show_mappings WHERE plex_title = 'Show Name'`)
- ✓ Verify episode exists in show's seasons JSON
- ✓ Check webhook log for errors (`SELECT error_message FROM plex_webhook_logs WHERE id = X`)
- ✓ Ensure auto_mark_watched is enabled in plex_config

### Conflicts created
- ✓ Go to `/settings/plex` in the UI
- ✓ Review suggested matches
- ✓ Select correct show or create new show
- ✓ Future webhooks will use the mapping

---

## Quick Test Script

Use the provided test script to verify everything is working:

```bash
# Run the existing test script
./test-plex-webhook.sh

# Or create a quick test:
curl -X POST "http://localhost:3000/api/plex/webhook?secret=YOUR_SECRET" \
  -F 'payload={"event":"media.scrobble","user":true,"owner":true,"Account":{"id":1,"thumb":"","title":"Test"},"Server":{"title":"Test","uuid":"test"},"Player":{"local":true,"publicAddress":"127.0.0.1","title":"Test","uuid":"test"},"Metadata":{"librarySectionType":"show","ratingKey":"12345","key":"/library/metadata/12345","parentRatingKey":"11111","grandparentRatingKey":"10000","guid":"com.plexapp.agents.themoviedb://1396?lang=en","type":"episode","title":"Pilot","grandparentTitle":"Breaking Bad","parentTitle":"Season 1","parentIndex":1,"index":1,"year":2008}}'
```

---

## Real-World Test Flow

### Recommended Test Show: Breaking Bad
(Commonly available, good for testing)

1. **Add to Tracker:**
   - Search for "Breaking Bad" in tracker
   - Add to your TV shows list

2. **Watch in Plex:**
   - Open Breaking Bad S01E01 in Plex
   - Watch to completion (or skip to 90%+)

3. **Verify:**
   ```bash
   # Check webhook received
   psql "$DATABASE_URL" -c "SELECT * FROM plex_webhook_logs WHERE plex_title = 'Breaking Bad' ORDER BY created_at DESC LIMIT 1;"

   # Check episode marked
   psql "$DATABASE_URL" -c "SELECT title, watched_episodes, total_episodes FROM tvshows WHERE title = 'Breaking Bad';"
   ```

4. **Expected Result:**
   - Webhook log shows `status: 'success', action: 'marked_watched'`
   - Episode S01E01 marked as watched in tracker
   - `watched_episodes` incremented by 1

---

## Testing Checklist

Use this checklist when testing with real Plex:

- [ ] ngrok running and URL obtained
- [ ] Webhook configured in Plex with correct secret
- [ ] Test show exists in tracker database
- [ ] Next.js server running on port 3000
- [ ] Watched episode in Plex to 90%+
- [ ] Webhook log created in database
- [ ] Show mapping created (or already exists)
- [ ] Episode marked as watched in tracker
- [ ] No errors in webhook log
- [ ] No unresolved conflicts (or conflict resolved)

---

## Advanced: Historical Sync

The webhook only captures new watches. To sync existing watch history:

### Option 1: Manual (for testing)
Watch episodes in Plex and they'll sync automatically.

### Option 2: API Sync (future feature)
```bash
# This feature is planned but not yet implemented
# Would call Plex API to fetch all watched episodes
# and batch update the tracker database
```

---

## Monitoring in Production

### Key Metrics to Watch:

1. **Webhook Success Rate**
   ```sql
   SELECT
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM plex_webhook_logs
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

2. **Average Response Time**
   ```sql
   SELECT
     AVG((payload->>'duration')::int) as avg_ms,
     MIN((payload->>'duration')::int) as min_ms,
     MAX((payload->>'duration')::int) as max_ms
   FROM plex_webhook_logs
   WHERE status = 'success'
     AND created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Unresolved Conflicts**
   ```sql
   SELECT COUNT(*) as unresolved_conflicts
   FROM plex_conflicts
   WHERE resolved = false;
   ```

4. **Most Active Shows**
   ```sql
   SELECT
     plex_title,
     COUNT(*) as webhooks_received
   FROM plex_webhook_logs
   WHERE status = 'success'
     AND created_at > NOW() - INTERVAL '7 days'
   GROUP BY plex_title
   ORDER BY webhooks_received DESC
   LIMIT 10;
   ```

---

## Support & Issues

### Common Issues:

**"Invalid webhook secret"**
- Secret mismatch between database and webhook URL
- Solution: Re-copy secret from database

**"Show not found in tracker"**
- Show doesn't exist in tvshows table
- Solution: Add show to tracker first

**"Episode not found in season data"**
- Episode metadata not in database
- Solution: Re-fetch show data from TMDB

**Rate limit exceeded (429)**
- Too many webhooks in short time
- Solution: Wait 60 seconds or adjust rate limit

### Debug Mode:

Enable verbose logging in webhook route:
```typescript
// In app/api/plex/webhook/route.ts
console.log('[Plex Webhook] Full payload:', JSON.stringify(payload, null, 2));
```

---

## Summary

The Plex webhook integration is fully functional and ready for real-world testing. Follow the steps above to connect your Plex server and start automatic episode tracking!

**Test Status:** ✓ All systems operational
**Next Step:** Connect Plex via ngrok and watch an episode!
