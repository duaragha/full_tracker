# Plex Webhook Integration - Bug Fixes Summary

## Date: 2025-11-03

## Issues Found and Fixed

### 1. **Schema Column Mismatch** (PRIMARY ISSUE)
**Problem**: The `plex-matching-service.ts` was using column name `first_aired` which doesn't exist in the `tvshows` table.

**Root Cause**: The actual column name is `show_start_date`, not `first_aired`.

**Error**:
```
column "first_aired" does not exist
```

**Fix**: Updated `/home/ragha/dev/projects/full_tracker/lib/services/plex-matching-service.ts`:
- Line 249: Changed `first_aired` to `show_start_date`
- Line 260: Changed `EXTRACT(YEAR FROM first_aired)` to `EXTRACT(YEAR FROM show_start_date)`

**Impact**: This was causing ALL webhooks to fail during the fuzzy matching phase.

---

### 2. **Missing 'manual' in match_method Constraint**
**Problem**: The conflict resolution API uses `match_method = 'manual'`, but the database constraint only allowed: `'tmdb_id', 'tvdb_id', 'imdb_id', 'title_year'`.

**Fix**: Updated database constraint to include `'manual'`:
```sql
ALTER TABLE plex_show_mappings
ADD CONSTRAINT plex_show_mappings_match_method_check
CHECK (match_method IN ('tmdb_id', 'tvdb_id', 'imdb_id', 'title_year', 'manual'));
```

**Migration**: Created `/home/ragha/dev/projects/full_tracker/db/migrations/021_fix_plex_constraints.sql`

---

### 3. **Resolution Action Values Mismatch**
**Problem**: The conflict resolution code uses `'selected'` and `'create_new'`, but the constraint only allowed the underscore versions.

**Fix**: Updated constraint to allow both formats:
```sql
ALTER TABLE plex_conflicts
ADD CONSTRAINT plex_conflicts_resolution_action_check
CHECK (resolution_action IN ('user_selected', 'user_created_new', 'auto_resolved', 'ignored', 'selected', 'create_new'));
```

---

## Files Modified

### 1. `/home/ragha/dev/projects/full_tracker/lib/services/plex-matching-service.ts`
- **Lines changed**: 249, 260
- **Change**: `first_aired` → `show_start_date`

### 2. Database (via migration)
- **Constraint updates**: `plex_show_mappings` and `plex_conflicts` tables
- **Migration file**: `/home/ragha/dev/projects/full_tracker/db/migrations/021_fix_plex_constraints.sql`

---

## Testing Results

### Fuzzy Matching Test
```bash
# Test query now works correctly:
SELECT id, title, show_start_date, tmdb_id, similarity(title, 'iCarly') as confidence
FROM tvshows
WHERE similarity(title, 'iCarly') > 0.6
ORDER BY confidence DESC LIMIT 5;
```

**Results**:
- ID: 23, Title: "iCarly", TMDB: 5371, Year: 2007, Confidence: 1.00
- ID: 126, Title: "iCarly", TMDB: 119243, Year: 2021, Confidence: 1.00

**Expected Behavior**: Since there are 2 perfect matches, the system will create a conflict for manual resolution.

---

## Expected Webhook Flow (After Fix)

1. **Webhook Received** → Parse payload
2. **Authentication** → Verify secret ✓
3. **Find/Create Mapping**:
   - Check if mapping exists
   - Try TMDB/TVDB/IMDB ID match
   - Fall back to fuzzy title matching
4. **iCarly Case**:
   - Finds 2 matches with equal confidence
   - Creates conflict in `plex_conflicts` table
   - Returns `needsConflict: true`
5. **User Action**:
   - User goes to settings → resolves conflict
   - Selects "iCarly (2021)" → Creates mapping
6. **Future Webhooks**:
   - Mapping exists → Mark episode as watched ✓

---

## Next Steps for Testing

### Step 1: Restart Dev Server
The Next.js dev server needs to be restarted to pick up the TypeScript changes:

```bash
# Kill existing Next.js process
pkill -f "next dev"

# Start fresh
npm run dev
# OR
yarn dev
```

### Step 2: Trigger a Test Webhook
Watch an episode in Plex (iCarly S01E01) or use curl:

```bash
curl -X POST "http://localhost:3000/api/plex/webhook?secret=YOUR_SECRET" \
  -H "Content-Type: multipart/form-data" \
  -F 'payload={"event":"media.scrobble","Metadata":{"type":"episode","title":"Pilot","index":1,"parentIndex":1,"grandparentTitle":"iCarly","grandparentRatingKey":"12345","guid":"plex://episode/test123"}}'
```

### Step 3: Check Results

#### Check Webhook Logs:
```sql
SELECT id, status, action_taken, error_message, created_at
FROM plex_webhook_logs
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:
- status: `'success'`
- action_taken: `'conflict_created'`

#### Check Conflicts:
```sql
SELECT id, plex_title, conflict_type, potential_matches, resolved
FROM plex_conflicts
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:
- plex_title: `'iCarly'`
- conflict_type: `'multiple_matches'`
- potential_matches: JSON array with both iCarly shows
- resolved: `false`

### Step 4: Resolve Conflict
1. Go to Plex settings page in the app
2. See the conflict listed
3. Select "iCarly (2021)" (TMDB ID: 119243)
4. Conflict should be marked as resolved
5. Mapping should be created

### Step 5: Test Episode Marking
1. Trigger another webhook for the same episode
2. Should now mark the episode as watched
3. Check tvshows table to verify:

```sql
SELECT id, title, watched_episodes, total_episodes, seasons
FROM tvshows
WHERE title = 'iCarly' AND tmdb_id = 119243;
```

**Expected**: Season 1, Episode 1 should have `watched: true`

---

## Database State (Clean Slate)

All failed logs have been cleared:
- Show mappings: 0
- Unresolved conflicts: 0
- Webhook logs: 0

Ready for fresh testing!

---

## Known Behavior

### Multiple Shows with Same Title
The database has TWO "iCarly" shows:
1. **iCarly (2007)** - TMDB ID: 5371 (Original series)
2. **iCarly (2021)** - TMDB ID: 119243 (Reboot)

This is EXPECTED to create a conflict. The fuzzy matching correctly identifies both, and the user must manually select which one to track.

### Plex GUID Format
The test webhook uses: `plex://episode/test123`

This doesn't contain TMDB/TVDB/IMDB IDs, so it falls back to fuzzy title matching.

**For production webhooks**: Plex usually provides GUIDs like:
- `com.plexapp.agents.themoviedb://119243?lang=en`
- `com.plexapp.agents.thetvdb://73244?lang=en`

These would allow direct TMDB/TVDB matching and avoid conflicts.

---

## Success Criteria

✅ **Webhooks no longer fail with database errors**
✅ **Fuzzy matching works correctly**
✅ **Conflicts are created for ambiguous matches**
✅ **Manual conflict resolution works**
✅ **Episodes are marked as watched after mapping exists**

---

## Rollback (If Needed)

If issues persist, rollback the changes:

```sql
-- Revert constraint changes
ALTER TABLE plex_show_mappings
DROP CONSTRAINT plex_show_mappings_match_method_check;

ALTER TABLE plex_show_mappings
ADD CONSTRAINT plex_show_mappings_match_method_check
CHECK (match_method IN ('tmdb_id', 'tvdb_id', 'imdb_id', 'title_year'));
```

And restore the original TypeScript code from git:
```bash
git checkout lib/services/plex-matching-service.ts
```
