# Plex Webhook Testing Guide

## Quick Start

### 1. Restart Dev Server
```bash
# Kill any running Next.js processes
pkill -f "next dev"

# Start fresh (picks up TypeScript changes)
npm run dev
```

### 2. Send Test Webhook
```bash
# Get your webhook secret first
node -e "
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
(async () => {
  const result = await pool.query('SELECT webhook_secret FROM plex_config WHERE user_id = 1');
  console.log('Webhook URL:', \`http://localhost:3000/api/plex/webhook?secret=\${result.rows[0]?.webhook_secret || 'NOT_SET'}\`);
  await pool.end();
})();
"

# Then send test webhook (replace YOUR_SECRET with actual secret)
curl -X POST "http://localhost:3000/api/plex/webhook?secret=YOUR_SECRET" \
  -H "Content-Type: multipart/form-data" \
  -F 'payload={
    "event": "media.scrobble",
    "Metadata": {
      "type": "episode",
      "title": "iStart Over",
      "index": 1,
      "parentIndex": 1,
      "grandparentTitle": "iCarly",
      "grandparentRatingKey": "12345",
      "guid": "plex://episode/test123",
      "year": 2021
    }
  }'
```

### 3. Check Results
```bash
# Check webhook log
node -e "
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
(async () => {
  const logs = await pool.query('SELECT status, action_taken, error_message FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 1');
  console.log('Last webhook result:', logs.rows[0]);

  const conflicts = await pool.query('SELECT id, plex_title, conflict_type, potential_matches FROM plex_conflicts WHERE resolved = false');
  console.log('\\nUnresolved conflicts:', conflicts.rows.length);
  if (conflicts.rows.length > 0) {
    console.log('Conflict details:', JSON.stringify(conflicts.rows[0], null, 2));
  }

  const mappings = await pool.query('SELECT plex_title, tvshow_id, match_method FROM plex_show_mappings');
  console.log('\\nMappings:', mappings.rows.length);
  if (mappings.rows.length > 0) {
    console.log('Mapping details:', mappings.rows);
  }

  await pool.end();
})();
"
```

---

## Expected Test Results

### First Webhook (iCarly)
**Should create a conflict** because there are 2 iCarly shows:
```
status: 'success'
action_taken: 'conflict_created'
conflict_type: 'multiple_matches'
potential_matches: [
  { id: 23, title: 'iCarly', tmdb_id: 5371, confidence: 1.0 },  // 2007 version
  { id: 126, title: 'iCarly', tmdb_id: 119243, confidence: 1.0 }  // 2021 version
]
```

### After Manual Resolution
1. Go to: `http://localhost:3000/settings` (or wherever Plex settings page is)
2. Should see conflict with 2 options
3. Select "iCarly (2021)" - TMDB ID: 119243
4. Conflict resolved, mapping created

### Second Webhook (Same Episode)
**Should mark episode as watched**:
```
status: 'success'
action_taken: 'marked_watched'
```

---

## Debugging Commands

### View All Plex Tables
```bash
node -e "
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
(async () => {
  console.log('=== PLEX CONFIG ===');
  const config = await pool.query('SELECT enabled, auto_mark_watched, plex_server_name FROM plex_config');
  console.log(config.rows);

  console.log('\\n=== WEBHOOK LOGS ===');
  const logs = await pool.query('SELECT id, event_type, plex_title, status, action_taken, error_message, created_at FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 5');
  console.log(logs.rows);

  console.log('\\n=== MAPPINGS ===');
  const mappings = await pool.query('SELECT plex_rating_key, plex_title, tvshow_id, match_method, match_confidence FROM plex_show_mappings');
  console.log(mappings.rows);

  console.log('\\n=== CONFLICTS ===');
  const conflicts = await pool.query('SELECT id, plex_title, conflict_type, resolved FROM plex_conflicts ORDER BY created_at DESC');
  console.log(conflicts.rows);

  await pool.end();
})();
"
```

### Clear All Plex Data
```bash
node -e "
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
(async () => {
  await pool.query('DELETE FROM plex_webhook_logs');
  await pool.query('DELETE FROM plex_show_mappings');
  await pool.query('DELETE FROM plex_conflicts');
  console.log('All Plex data cleared!');
  await pool.end();
})();
"
```

### Check iCarly Shows in Database
```bash
node -e "
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
(async () => {
  const shows = await pool.query(\`
    SELECT id, title, tmdb_id, show_start_date,
           total_episodes, watched_episodes,
           jsonb_array_length(COALESCE(seasons, '[]'::jsonb)) as season_count
    FROM tvshows
    WHERE title ILIKE '%icarly%'
  \`);
  console.log('iCarly shows:');
  shows.rows.forEach(show => {
    console.log(\`  - ID \${show.id}: \${show.title} (\${new Date(show.show_start_date).getFullYear()})\`);
    console.log(\`    TMDB: \${show.tmdb_id}, Seasons: \${show.season_count}, Watched: \${show.watched_episodes}/\${show.total_episodes}\`);
  });
  await pool.end();
})();
"
```

### Test Fuzzy Matching
```bash
node -e "
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
(async () => {
  const title = 'iCarly';
  const result = await pool.query(\`
    SELECT id, title, show_start_date, tmdb_id, similarity(title, \$1) as confidence
    FROM tvshows
    WHERE similarity(title, \$1) > 0.6
    ORDER BY confidence DESC LIMIT 5
  \`, [title]);
  console.log(\`Fuzzy matches for \"\${title}\":\`);
  result.rows.forEach(row => {
    console.log(\`  - \${row.title} (ID: \${row.id}, TMDB: \${row.tmdb_id}, Confidence: \${row.confidence.toFixed(2)})\`);
  });
  await pool.end();
})();
"
```

---

## Common Issues

### Issue: "column first_aired does not exist"
**Status**: FIXED in this update
**Cause**: Schema mismatch
**Fix**: Code now uses `show_start_date` instead

### Issue: "no unique or exclusion constraint matching"
**Status**: FIXED (removed all problematic ON CONFLICT statements)
**Cause**: Incorrect use of ON CONFLICT without proper unique constraint
**Fix**: Changed to check-then-insert/update pattern

### Issue: "invalid input value for enum match_method"
**Status**: FIXED in this update
**Cause**: 'manual' not in CHECK constraint
**Fix**: Updated constraint to include 'manual'

### Issue: "Episodes not being marked as watched"
**Possible causes**:
1. No mapping exists (check conflicts)
2. Episode doesn't exist in seasons JSONB
3. auto_mark_watched is disabled

**Debug**:
```bash
# Check if show has episode data
node -e "
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
(async () => {
  const show = await pool.query('SELECT seasons FROM tvshows WHERE id = 126');
  const seasons = show.rows[0]?.seasons || [];
  console.log('Seasons data:', JSON.stringify(seasons, null, 2));
  await pool.end();
})();
"
```

---

## Success Checklist

- [ ] Dev server restarted
- [ ] No TypeScript compilation errors
- [ ] Webhook receives and authenticates correctly
- [ ] Fuzzy matching finds both iCarly shows
- [ ] Conflict created with 2 potential matches
- [ ] Conflict resolution UI works
- [ ] After resolution, mapping exists
- [ ] Second webhook marks episode as watched
- [ ] Episode data updated in tvshows.seasons JSONB

---

## Next: Production Testing

Once local testing passes, test with real Plex webhooks:

1. Ensure PUBLIC_WEBHOOK_URL is set correctly
2. Configure webhook in Plex settings
3. Watch a real episode
4. Monitor webhook logs
5. Verify episode marked as watched

**Production webhook URL format**:
```
https://your-domain.com/api/plex/webhook?secret=YOUR_SECRET
```
