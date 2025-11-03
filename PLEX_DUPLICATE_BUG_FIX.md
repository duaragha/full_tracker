# Plex Webhook Duplicate Detection Bug - Fixed

## Issue Summary

**Date**: November 3, 2025
**Status**: ✅ **FIXED**

### Problem
When finishing an episode (iCarly 2021 S3E10), Plex sent a `media.scrobble` event, but the webhook marked it as a **duplicate** and ignored it, preventing the episode from being marked as watched.

### Root Cause
The duplicate detection logic in `PlexWebhookService.checkDuplicate()` was checking for **ALL** webhook events within the last 5 minutes, not just duplicate scrobble events.

**What happened:**
1. User watches episode 10
2. Plex sends `media.pause`, `media.resume`, `media.stop` events (logged in database)
3. User finishes episode (~90% watched)
4. Plex sends `media.scrobble` event
5. Duplicate check finds the earlier pause/resume events (within 5 min window)
6. Marks scrobble as "duplicate" and ignores it ❌
7. Episode never gets marked as watched

### The Fix

**File**: `/lib/services/plex-webhook-service.ts`

**Changed** the duplicate detection query to only check for duplicate **scrobble** events:

```typescript
// BEFORE (incorrect)
const result = await pool.query(
  `SELECT id FROM plex_webhook_logs
   WHERE plex_rating_key = $1
     AND plex_season = $2
     AND plex_episode = $3
     AND created_at > NOW() - INTERVAL '5 minutes'
   LIMIT 1`,
  [ratingKey, seasonNumber, episodeNumber]
);

// AFTER (correct)
const result = await pool.query(
  `SELECT id FROM plex_webhook_logs
   WHERE plex_rating_key = $1
     AND plex_season = $2
     AND plex_episode = $3
     AND event_type = 'media.scrobble'  // ← Added this line
     AND created_at > NOW() - INTERVAL '5 minutes'
   LIMIT 1`,
  [ratingKey, seasonNumber, episodeNumber]
);
```

### Manual Fix Applied

Since S3E10 was incorrectly ignored, I manually marked it as watched:
- **Show**: iCarly (2021) [ID: 126]
- **Episode**: S3E10 "iHave a Proposal"
- **Status**: Now marked as watched ✓
- **Progress**: 33/33 episodes watched

### Testing

The fix ensures:
- ✅ `media.play`, `media.pause`, `media.resume`, `media.stop` events are correctly logged but ignored
- ✅ `media.scrobble` events are processed and mark episodes as watched
- ✅ True duplicate scrobbles (same episode within 5 minutes) are still detected and ignored
- ✅ No false positives from non-scrobble events

### Event Flow (Correct Behavior)

```
User watches episode → media.play (ignored)
User pauses          → media.pause (ignored)
User resumes         → media.resume (ignored)
User finishes (90%)  → media.scrobble (PROCESSED ✓)
                       └─> Episode marked as watched

User rewinds & rewatches → media.scrobble (duplicate, ignored)
```

## Verification

Run this query to see recent webhook events:
```sql
SELECT event_type, plex_title, plex_season, plex_episode,
       status, action_taken, created_at
FROM plex_webhook_logs
WHERE plex_title LIKE '%iCarly%'
ORDER BY created_at DESC
LIMIT 10;
```

## Impact

- **Severity**: High - Episodes weren't being marked as watched
- **Affected Users**: Anyone using Plex webhook integration
- **Fixed**: ✅ Code updated, manual fix applied for S3E10
- **Next Steps**: Monitor webhook logs to ensure correct behavior

## Deployment

1. ✅ Code fix applied to `plex-webhook-service.ts`
2. ✅ Manual episode update completed
3. 🔄 Server restart recommended to apply changes
4. ✅ No database migration needed

---

**Resolved by**: Claude Code
**Verification**: Episode marked as watched, 33/33 complete
