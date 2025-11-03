# Plex Integration Architecture Diagram

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER'S PLEX ECOSYSTEM                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │
│  │   Plex TV   │         │ Plex Mobile │         │  Plex Web   │       │
│  │   (Living   │         │    (iOS/    │         │    (Mac)    │       │
│  │    Room)    │         │   Android)  │         │             │       │
│  └──────┬──────┘         └──────┬──────┘         └──────┬──────┘       │
│         │                       │                       │               │
│         └───────────────────────┼───────────────────────┘               │
│                                 │                                       │
│                         ┌───────▼────────┐                              │
│                         │  Plex Server   │                              │
│                         │ (192.168.1.x)  │                              │
│                         │                │                              │
│                         │  - Detects     │                              │
│                         │    watch       │                              │
│                         │    events      │                              │
│                         │  - Sends       │                              │
│                         │    webhooks    │                              │
│                         └───────┬────────┘                              │
│                                 │                                       │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  │ HTTPS POST (webhook)
                                  │ media.scrobble event
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      YOUR TRACKER APPLICATION                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                    API LAYER (Next.js)                         │     │
│  ├────────────────────────────────────────────────────────────────┤     │
│  │                                                                │     │
│  │  POST /api/plex/webhook                                        │     │
│  │  ┌────────────────────────────────────────────────────┐        │     │
│  │  │ 1. Parse multipart form-data                       │        │     │
│  │  │ 2. Verify webhook secret                           │        │     │
│  │  │ 3. Rate limit check (100/min)                      │        │     │
│  │  │ 4. Check for duplicates                            │        │     │
│  │  │ 5. Call PlexWebhookService                         │        │     │
│  │  └────────────────────┬───────────────────────────────┘        │     │
│  │                       │                                        │     │
│  │  GET/POST /api/plex/config                                     │     │
│  │  ┌────────────────────────────────────────────────────┐        │     │
│  │  │ - Save encrypted Plex token                        │        │     │
│  │  │ - Generate webhook URL                             │        │     │
│  │  │ - Configure auto-add/auto-watch settings           │        │     │
│  │  └────────────────────────────────────────────────────┘        │     │
│  │                                                                │     │
│  │  GET /api/plex/conflicts                                       │     │
│  │  POST /api/plex/conflicts/:id/resolve                          │     │
│  │  ┌────────────────────────────────────────────────────┐        │     │
│  │  │ - List unresolved show mappings                    │        │     │
│  │  │ - Allow user to confirm matches                    │        │     │
│  │  └────────────────────────────────────────────────────┘        │     │
│  │                                                                │     │
│  └────────────────────────┬───────────────────────────────────────┘     │
│                           │                                             │
│  ┌────────────────────────▼───────────────────────────────────────┐     │
│  │                  SERVICE LAYER                                 │     │
│  ├────────────────────────────────────────────────────────────────┤     │
│  │                                                                │     │
│  │  PlexWebhookService                                            │     │
│  │  ┌──────────────────────────────────────────────────┐          │     │
│  │  │ processWebhook(payload)                          │          │     │
│  │  │  ├─ Validate payload structure                   │          │     │
│  │  │  ├─ Extract show/episode info                    │          │     │
│  │  │  ├─ Call PlexMatchingService                     │          │     │
│  │  │  ├─ Call PlexEpisodeService                      │          │     │
│  │  │  └─ Log to database                              │          │     │
│  │  └──────────────────────────────────────────────────┘          │     │
│  │                           │                                     │     │
│  │  PlexMatchingService      │  PlexEpisodeService                │     │
│  │  ┌─────────────────────┐  │  ┌─────────────────────┐           │     │
│  │  │ findOrCreateMapping │  │  │ markEpisodeWatched  │           │     │
│  │  │  ├─ Extract IDs     │  │  │  ├─ Find show       │           │     │
│  │  │  ├─ Query tracker   │  │  │  ├─ Find season     │           │     │
│  │  │  ├─ Call TMDB API   │  │  │  ├─ Find episode    │           │     │
│  │  │  ├─ Fuzzy match     │  │  │  ├─ Check watched   │           │     │
│  │  │  └─ Create conflict │  │  │  ├─ Update DB       │           │     │
│  │  └─────────────────────┘  │  │  └─ Recalc totals   │           │     │
│  │                           │  └─────────────────────┘           │     │
│  │                           │                                     │     │
│  │  EncryptionService        │                                     │     │
│  │  ┌─────────────────────┐  │                                     │     │
│  │  │ encrypt(token)      │  │                                     │     │
│  │  │ decrypt(encrypted)  │  │                                     │     │
│  │  │ AES-256-GCM         │  │                                     │     │
│  │  └─────────────────────┘  │                                     │     │
│  │                           │                                     │     │
│  └───────────────────────────┼─────────────────────────────────────┘     │
│                              │                                           │
│  ┌───────────────────────────▼─────────────────────────────────────┐     │
│  │                    DATABASE LAYER (PostgreSQL)                  │     │
│  ├─────────────────────────────────────────────────────────────────┤     │
│  │                                                                 │     │
│  │  plex_config                                                    │     │
│  │  ┌──────────────────────────────────────────────────────┐       │     │
│  │  │ id | user_id | plex_token (encrypted) | enabled     │       │     │
│  │  │ auto_add_shows | auto_mark_watched | webhook_secret │       │     │
│  │  └──────────────────────────────────────────────────────┘       │     │
│  │                                                                 │     │
│  │  plex_show_mappings                                             │     │
│  │  ┌──────────────────────────────────────────────────────┐       │     │
│  │  │ plex_rating_key | plex_guid | tvshow_id (FK)        │       │     │
│  │  │ tmdb_id | tvdb_id | imdb_id | match_confidence      │       │     │
│  │  │ match_method | manually_confirmed | sync_enabled    │       │     │
│  │  └──────────────────────────────────────────────────────┘       │     │
│  │                                                                 │     │
│  │  plex_webhook_logs                                              │     │
│  │  ┌──────────────────────────────────────────────────────┐       │     │
│  │  │ event_type | status | action_taken | payload (JSON)  │       │     │
│  │  │ plex_title | plex_season | plex_episode | tvshow_id  │       │     │
│  │  │ processing_duration_ms | error_message | created_at  │       │     │
│  │  └──────────────────────────────────────────────────────┘       │     │
│  │                                                                 │     │
│  │  plex_conflicts                                                 │     │
│  │  ┌──────────────────────────────────────────────────────┐       │     │
│  │  │ plex_title | conflict_type | potential_matches (JSON)│       │     │
│  │  │ resolved | resolved_tvshow_id | resolution_action    │       │     │
│  │  └──────────────────────────────────────────────────────┘       │     │
│  │                                                                 │     │
│  │  tvshows (existing + new columns)                              │     │
│  │  ┌──────────────────────────────────────────────────────┐       │     │
│  │  │ id | tmdb_id | title | seasons (JSONB) | ...         │       │     │
│  │  │ plex_synced | plex_last_sync | source ('plex')       │       │     │
│  │  └──────────────────────────────────────────────────────┘       │     │
│  │                                                                 │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ External API Calls
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TMDB API (already integrated)                                           │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │ /find/{tvdb_id}?external_source=tvdb_id                        │      │
│  │ /find/{imdb_id}?external_source=imdb_id                        │      │
│  │ /tv/{tmdb_id}  (get show details)                              │      │
│  └────────────────────────────────────────────────────────────────┘      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Episode Watched Event

```
┌─────────────┐
│ User watches│
│ episode on  │
│    Plex     │
└──────┬──────┘
       │
       │ 1. Plex detects scrobble
       │
       ▼
┌─────────────────┐
│  Plex Server    │
│  sends webhook  │
└──────┬──────────┘
       │
       │ 2. POST /api/plex/webhook
       │    {
       │      event: "media.scrobble",
       │      Metadata: {
       │        grandparentTitle: "The Office",
       │        parentIndex: 2,
       │        index: 3
       │      }
       │    }
       │
       ▼
┌─────────────────────────────────────┐
│  Webhook Endpoint                   │
│  ─────────────────────────────────  │
│  1. Verify secret                   │
│  2. Rate limit check                │
│  3. Parse payload                   │
│  4. Check duplicate                 │
└──────┬──────────────────────────────┘
       │
       │ 5. Call PlexWebhookService.processWebhook()
       │
       ▼
┌─────────────────────────────────────┐
│  PlexWebhookService                 │
│  ─────────────────────────────────  │
│  Extract info:                      │
│  - Show: "The Office"               │
│  - GUID: "themoviedb://1418"        │
│  - Season: 2                        │
│  - Episode: 3                       │
└──────┬──────────────────────────────┘
       │
       │ 6. Find or create mapping
       │
       ▼
┌─────────────────────────────────────┐
│  PlexMatchingService                │
│  ─────────────────────────────────  │
│  Check if mapping exists:           │
│    SELECT * FROM                    │
│    plex_show_mappings               │
│    WHERE plex_rating_key = '12343'  │
└──────┬──────────────────────────────┘
       │
       ├─── No mapping found
       │    │
       │    ▼
       │    ┌────────────────────────────┐
       │    │ Extract TMDB ID from GUID  │
       │    │ GUID: themoviedb://1418    │
       │    │ → tmdb_id = 1418           │
       │    └────────┬───────────────────┘
       │             │
       │             ▼
       │    ┌────────────────────────────┐
       │    │ Query tracker:             │
       │    │ SELECT id FROM tvshows     │
       │    │ WHERE tmdb_id = 1418       │
       │    └────────┬───────────────────┘
       │             │
       │             ├─── Found (confidence 1.0)
       │             │    │
       │             │    ▼
       │             │    ┌──────────────────┐
       │             │    │ Create mapping   │
       │             │    │ tvshow_id = 42   │
       │             │    └────────┬─────────┘
       │             │             │
       │             └─── Not found
       │                  │
       │                  ▼
       │                  ┌──────────────────┐
       │                  │ Fuzzy title match│
       │                  │ pg_trgm          │
       │                  └────────┬─────────┘
       │                           │
       │                           ├─── High conf (>0.9)
       │                           │    Create mapping
       │                           │
       │                           └─── Low conf (<0.9)
       │                                Create conflict
       │
       └─── Mapping exists
            │
            ▼
       ┌────────────────────────────┐
       │ tvshow_id = 42             │
       └────────┬───────────────────┘
                │
                │ 7. Mark episode watched
                │
                ▼
       ┌─────────────────────────────────────┐
       │  PlexEpisodeService                 │
       │  ─────────────────────────────────  │
       │  1. Get show from database          │
       │     SELECT seasons FROM tvshows     │
       │     WHERE id = 42                   │
       │                                     │
       │  2. Find season 2 in seasons JSON   │
       │                                     │
       │  3. Find episode 3 in episodes      │
       │                                     │
       │  4. Check if already watched        │
       │     - If yes: skip (preserve date)  │
       │     - If no: continue               │
       │                                     │
       │  5. Update episode                  │
       │     episode.watched = true          │
       │     episode.dateWatched = now()     │
       │                                     │
       │  6. Recalculate totals              │
       │     watchedEpisodes++               │
       │     totalMinutes += runtime         │
       │                                     │
       │  7. Update database                 │
       │     UPDATE tvshows SET              │
       │       seasons = $1,                 │
       │       watched_episodes = $2,        │
       │       total_minutes = $3            │
       │     WHERE id = 42                   │
       └────────┬────────────────────────────┘
                │
                │ 8. Log webhook
                │
                ▼
       ┌─────────────────────────────────────┐
       │  INSERT INTO plex_webhook_logs      │
       │  ─────────────────────────────────  │
       │  event_type: 'media.scrobble'       │
       │  status: 'success'                  │
       │  action_taken: 'marked_watched'     │
       │  tvshow_id: 42                      │
       │  plex_season: 2                     │
       │  plex_episode: 3                    │
       │  processing_duration_ms: 150        │
       └────────┬────────────────────────────┘
                │
                │ 9. Return success
                │
                ▼
       ┌─────────────────────────────────────┐
       │  HTTP 200 OK                        │
       │  { status: "success" }              │
       └─────────────────────────────────────┘
```

---

## Matching Algorithm Flow

```
┌──────────────────────────────┐
│ Plex Show Info:              │
│ - Title: "The Office"        │
│ - GUID: themoviedb://1418    │
│ - Year: 2005                 │
└──────────┬───────────────────┘
           │
           │ 1. Extract external IDs
           │
           ▼
┌──────────────────────────────┐
│ Parse GUID:                  │
│ - themoviedb://1418          │
│   → tmdb_id = 1418           │
│                              │
│ - thetvdb://121361           │
│   → tvdb_id = 121361         │
│                              │
│ - imdb://tt0944947           │
│   → imdb_id = tt0944947      │
└──────────┬───────────────────┘
           │
           │ 2. Try exact TMDB match
           │
           ▼
     ┌─────────────────────────┐
     │ SELECT * FROM tvshows   │
     │ WHERE tmdb_id = 1418    │
     └──────┬──────────────────┘
            │
      ┌─────┴─────┐
      │           │
   Found       Not Found
      │           │
      ▼           │
┌────────────┐    │
│ Confidence │    │ 3. Try TVDB → TMDB conversion
│    1.0     │    │
│            │    ▼
│ Return     │    ┌──────────────────────────────┐
│ tvshow_id  │    │ TMDB API:                    │
└────────────┘    │ /find/121361?source=tvdb_id  │
                  │ → { tv_results: [{id: 1418}] │
                  └──────────┬───────────────────┘
                             │
                       ┌─────┴─────┐
                       │           │
                    Found       Not Found
                       │           │
                       ▼           │
                 ┌────────────┐    │ 4. Try IMDB → TMDB conversion
                 │ Confidence │    │
                 │    0.95    │    ▼
                 │            │    (similar to TVDB)
                 │ Return     │
                 │ tvshow_id  │
                 └────────────┘    │
                                   │ 5. Fuzzy title + year match
                                   │
                                   ▼
                       ┌──────────────────────────────┐
                       │ SELECT                       │
                       │   id,                        │
                       │   title,                     │
                       │   similarity(title, $1) sim  │
                       │ FROM tvshows                 │
                       │ WHERE                        │
                       │   similarity(title, $1) > 0.6│
                       │   AND YEAR(show_start_date)  │
                       │       BETWEEN 2004 AND 2006  │
                       │ ORDER BY sim DESC            │
                       └──────────┬───────────────────┘
                                  │
                       ┌──────────┴──────────┐
                       │                     │
                  Single match        Multiple matches
                  sim > 0.9           or sim < 0.9
                       │                     │
                       ▼                     ▼
                 ┌────────────┐        ┌──────────────┐
                 │ Confidence │        │ Create       │
                 │  0.6-0.85  │        │ Conflict     │
                 │            │        │ for user     │
                 │ Auto-map   │        │ resolution   │
                 │ if > 0.90  │        └──────────────┘
                 └────────────┘
```

---

## Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: HTTPS                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │ All traffic encrypted in transit (TLS 1.3)         │      │
│  │ Webhook URL: https://domain.com/api/plex/webhook   │      │
│  └────────────────────────────────────────────────────┘      │
│                          │                                   │
│  Layer 2: Webhook Secret                                     │
│  ┌────────────────────────────────────────────────────┐      │
│  │ URL parameter: ?secret=<64-char-random-hex>        │      │
│  │ Generated on config save                           │      │
│  │ Stored in database, verified on each request       │      │
│  └────────────────────────────────────────────────────┘      │
│                          │                                   │
│  Layer 3: Rate Limiting                                      │
│  ┌────────────────────────────────────────────────────┐      │
│  │ 100 requests per minute per IP                     │      │
│  │ Prevents DoS attacks                               │      │
│  │ Returns 429 if exceeded                            │      │
│  └────────────────────────────────────────────────────┘      │
│                          │                                   │
│  Layer 4: Payload Validation                                 │
│  ┌────────────────────────────────────────────────────┐      │
│  │ Validate JSON structure                            │      │
│  │ Check required fields                              │      │
│  │ Sanitize inputs                                    │      │
│  │ Type checking with Zod schemas                     │      │
│  └────────────────────────────────────────────────────┘      │
│                          │                                   │
│  Layer 5: Database Security                                  │
│  ┌────────────────────────────────────────────────────┐      │
│  │ Parameterized queries (prevent SQL injection)      │      │
│  │ Encrypted token storage (AES-256-GCM)              │      │
│  │ Row-level locking (prevent race conditions)        │      │
│  │ Least privilege database user                      │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Token Encryption:
┌─────────────┐           ┌──────────────────┐           ┌──────────────┐
│ Plex Token  │  encrypt  │ Encrypted String │  store    │  Database    │
│ (plaintext) ├──────────>│ iv:tag:ciphertext├──────────>│ plex_config  │
│ abc123...   │           │ a1b2:c3d4:e5f6...│           │ plex_token   │
└─────────────┘           └──────────────────┘           └──────────────┘
                                   │
                                   │ decrypt when needed
                                   ▼
                          ┌──────────────────┐
                          │ Plex API Call    │
                          │ X-Plex-Token:    │
                          │ abc123...        │
                          └──────────────────┘
```

---

## Monitoring Dashboard (Conceptual)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLEX SYNC DASHBOARD                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Status: ● Connected                Last Webhook: 2 min ago    │
│  Auto-add: ON    Auto-watch: ON                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sync Statistics (Last 30 Days)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  Total Webhooks Received: 1,234                        │   │
│  │  ├─ Success: 1,180 (95.6%)  ███████████████████░░      │   │
│  │  ├─ Failed: 24 (1.9%)       █░░░░░░░░░░░░░░░░░░        │   │
│  │  ├─ Ignored: 18 (1.5%)      █░░░░░░░░░░░░░░░░░░        │   │
│  │  └─ Duplicates: 12 (1.0%)   █░░░░░░░░░░░░░░░░░░        │   │
│  │                                                         │   │
│  │  Episodes Marked Watched: 856                          │   │
│  │  Shows Auto-Added: 12                                  │   │
│  │  Avg Processing Time: 142ms                            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Show Mappings                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Total Shows: 45                                        │   │
│  │  ├─ Mapped: 42 (93.3%)                                  │   │
│  │  ├─ Unmapped: 3 (6.7%)                                  │   │
│  │  └─ Conflicts: 3                                        │   │
│  │                                                         │   │
│  │  Confidence Distribution:                              │   │
│  │  ├─ High (≥0.90): 38 shows  ████████████████████       │   │
│  │  ├─ Medium (0.70-0.89): 4   ██░░░░░░░░░░░░░░░░░        │   │
│  │  └─ Low (<0.70): 0          ░░░░░░░░░░░░░░░░░░░        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pending Conflicts (3)                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. "The Office" (2005)                                 │   │
│  │     Multiple matches: US version vs UK version          │   │
│  │     [Resolve] [Ignore]                                  │   │
│  │                                                         │   │
│  │  2. "Breaking Bad" (2008)                               │   │
│  │     No match found in tracker                           │   │
│  │     [Add New Show] [Ignore]                             │   │
│  │                                                         │   │
│  │  3. "Game of Thrones" (2011)                            │   │
│  │     Ambiguous match (confidence: 0.72)                  │   │
│  │     [Confirm] [Search Again] [Ignore]                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Recent Activity                                                │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Time       │ Show          │ Episode │ Status         │     │
│  ├───────────────────────────────────────────────────────┤     │
│  │ 2 min ago  │ The Office    │ S02E03  │ ✓ Watched      │     │
│  │ 1 hour ago │ Breaking Bad  │ S01E01  │ ⚠ Conflict     │     │
│  │ 3 hours    │ Parks & Rec   │ S05E10  │ ✓ Watched      │     │
│  │ Yesterday  │ The Wire      │ S03E08  │ ✓ Watched      │     │
│  │ 2 days ago │ Succession    │ S04E01  │ ⚠ Failed       │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  [View All Logs] [Export Data] [Settings]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
/home/ragha/dev/projects/full_tracker/
│
├── docs/
│   ├── PLEX_INTEGRATION_ARCHITECTURE.md      ← Main architecture (45k words)
│   ├── PLEX_SETUP_GUIDE.md                   ← User setup instructions
│   ├── PLEX_IMPLEMENTATION_CHECKLIST.md      ← Developer checklist
│   ├── PLEX_INTEGRATION_SUMMARY.md           ← Quick reference
│   └── PLEX_ARCHITECTURE_DIAGRAM.md          ← This file (visual diagrams)
│
├── db/
│   └── migrations/
│       └── 020_add_plex_integration.sql      ← Database schema
│
├── types/
│   └── plex.ts                               ← TypeScript type definitions
│
├── lib/
│   ├── services/
│   │   ├── encryption-service.ts             ← Token encryption (implemented)
│   │   ├── plex-webhook-service.ts           ← Webhook processor (to implement)
│   │   ├── plex-matching-service.ts          ← Show matching (to implement)
│   │   └── plex-episode-service.ts           ← Episode tracking (to implement)
│   │
│   └── db/
│       └── plex-store.ts                     ← Database queries (to implement)
│
├── app/
│   └── api/
│       └── plex/
│           ├── webhook/
│           │   └── route.ts                  ← Webhook endpoint (to implement)
│           ├── config/
│           │   └── route.ts                  ← Config endpoint (to implement)
│           ├── mappings/
│           │   ├── route.ts                  ← Mappings list (to implement)
│           │   └── [id]/
│           │       └── route.ts              ← Mapping update (to implement)
│           ├── conflicts/
│           │   ├── route.ts                  ← Conflicts list (to implement)
│           │   └── [id]/
│           │       └── resolve/
│           │           └── route.ts          ← Resolve conflict (to implement)
│           └── logs/
│               └── route.ts                  ← Webhook logs (to implement)
│
└── components/
    └── plex/
        ├── settings-form.tsx                 ← Settings UI (to implement)
        ├── conflict-resolver.tsx             ← Conflict resolution (to implement)
        ├── activity-log.tsx                  ← Activity log (to implement)
        └── mappings-list.tsx                 ← Mappings UI (to implement)
```

---

## Technology Stack

```
┌────────────────────────────────────────────────────────────┐
│                    FRONTEND STACK                          │
├────────────────────────────────────────────────────────────┤
│ Next.js 16       │ React framework (already in use)        │
│ React 19         │ UI library (already in use)             │
│ TypeScript       │ Type safety (already in use)            │
│ Tailwind CSS     │ Styling (already in use)                │
│ shadcn/ui        │ Component library (already in use)      │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    BACKEND STACK                           │
├────────────────────────────────────────────────────────────┤
│ Next.js API      │ API routes (already in use)             │
│ Node.js          │ Runtime (already in use)                │
│ PostgreSQL       │ Database (already in use)               │
│ pg               │ PostgreSQL client (already in use)      │
│ pg_trgm          │ Fuzzy matching (extension)              │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                         │
├────────────────────────────────────────────────────────────┤
│ TMDB API         │ Show metadata & ID conversion (existing)│
│ Plex API         │ Webhooks & metadata (new)               │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    SECURITY TOOLS                          │
├────────────────────────────────────────────────────────────┤
│ crypto (Node.js) │ AES-256-GCM encryption                  │
│ Zod              │ Runtime validation (optional)           │
└────────────────────────────────────────────────────────────┘
```

---

## Key Metrics & Performance

```
Target Performance Benchmarks:

┌─────────────────────────────────────────────────────┐
│ Metric                        │ Target   │ Maximum  │
├───────────────────────────────┼──────────┼──────────┤
│ Webhook processing time       │ 200ms    │ 500ms    │
│ Database query time           │ 20ms     │ 50ms     │
│ External API call (TMDB)      │ 500ms    │ 1000ms   │
│ Full flow (webhook → DB)      │ 1000ms   │ 2000ms   │
│ Webhook throughput            │ 100/min  │ -        │
│ Auto-mapping accuracy         │ 90%      │ -        │
│ Conflict resolution time      │ -        │ 24 hours │
└─────────────────────────────────────────────────────┘

Database Size Estimates (1 year, 100 shows):

┌─────────────────────────────────────────────────────┐
│ Table                  │ Rows/Year │ Storage        │
├────────────────────────┼───────────┼────────────────┤
│ plex_config            │ 1         │ < 1 KB         │
│ plex_show_mappings     │ 100       │ ~ 50 KB        │
│ plex_webhook_logs      │ 36,500    │ ~ 50 MB        │
│ plex_conflicts         │ 10-20     │ < 10 KB        │
└─────────────────────────────────────────────────────┘

Note: Webhook logs should be cleaned periodically (90+ days)
```

---

This diagram document provides visual representations of the architecture. Refer to the main architecture document for detailed specifications and implementation guides.
