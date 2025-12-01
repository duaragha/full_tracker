# SPEC-PLEX-001: Plex Full Show Sync and RSS Feed Completion

<!-- TAG BLOCK -->
<!-- TAG:SPEC-PLEX-001 -->
<!-- PARENT:none -->
<!-- STATUS:draft -->
<!-- PRIORITY:medium -->
<!-- CREATED:2025-11-28 -->
<!-- UPDATED:2025-11-28 -->

---

## Environment

### Current System State

- **Framework**: Next.js 16.0.1 with App Router
- **Plex Integration**: Webhook-based, partial sync implemented
- **RSS Integration**: Basic feed parsing, missing scheduling
- **Database**: PostgreSQL with tvshows and rss_feeds tables

### Plex Integration Status

| Feature | Status | Location |
|---------|--------|----------|
| Webhook receiver | Complete | `app/api/plex/webhook/route.ts` |
| Episode tracking | Complete | `lib/services/plex-webhook-service.ts` |
| Full show sync | TODO | `lib/services/plex-episode-service.ts:221` |
| Watch status sync | Partial | Webhook only |

### RSS Integration Status

| Feature | Status | Notes |
|---------|--------|-------|
| Feed parsing | Complete | Uses article-extractor |
| Manual refresh | Complete | Button trigger |
| Auto-scheduling | Missing | No cron/interval |
| Deduplication | Partial | Basic URL matching |

### Relevant Code Locations

**Plex**:
- `lib/services/plex-episode-service.ts` - Episode service with TODO at line 221
- `lib/services/plex-webhook-service.ts` - Webhook processing
- `app/api/plex/sync/route.ts` - Sync API endpoints
- `app/settings/plex/page.tsx` - Plex settings UI

**RSS**:
- `lib/services/rss-service.ts` - RSS feed management
- `app/api/rss/route.ts` - RSS API endpoints
- Database: `rss_feeds`, `rss_items` tables

---

## Assumptions

### A1: Plex API Availability

- Plex server is accessible via configured PLEX_URL
- PLEX_TOKEN has sufficient permissions
- API rate limits are generous (1000+ requests/hour)

### A2: Show Data Structure

- Shows have unique Plex rating keys
- Episodes are organized by season/episode number
- Watch status is available per episode

### A3: RSS Feed Standards

- Feeds conform to RSS 2.0 or Atom standards
- Feed items have unique identifiers (guid or link)
- Scheduled refresh interval: 30 minutes to 24 hours

### A4: Background Processing

- Next.js serverless functions have 10-60 second timeout
- Long-running tasks need chunking or external scheduler
- Vercel Cron or Railway Cron available for scheduling

---

## Requirements

### R1: Full Show Sync from Plex (HIGH)

**EARS Pattern**: *Event-driven requirement*

**WHEN** a user requests full show sync from Plex
**THE SYSTEM** SHALL:
1. Fetch all episodes for the selected show from Plex API
2. Create or update TV show record in database
3. Create episode records for each episode
4. Mark episodes as watched based on Plex viewCount
5. Preserve existing user ratings and notes

**SO THAT** historical viewing data is preserved without manual entry.

**Implementation Location**: `lib/services/plex-episode-service.ts:221`

**Current State**:
```typescript
// TODO: Implement full show sync
async syncFullShow(ratingKey: string): Promise<SyncResult> {
  // TODO: Implement full show sync
  throw new Error('Not implemented');
}
```

**Target State**:
```typescript
async syncFullShow(ratingKey: string): Promise<SyncResult> {
  // 1. Fetch show metadata from Plex
  const show = await this.fetchShowMetadata(ratingKey);

  // 2. Create/update show in database
  const dbShow = await this.upsertShow(show);

  // 3. Fetch all seasons
  const seasons = await this.fetchSeasons(ratingKey);

  // 4. For each season, fetch episodes
  for (const season of seasons) {
    const episodes = await this.fetchEpisodes(season.ratingKey);

    // 5. Create/update episodes with watch status
    for (const episode of episodes) {
      await this.upsertEpisode(dbShow.id, episode);
    }
  }

  return { success: true, episodesProcessed: count };
}
```

---

### R2: Bulk Show Import (MEDIUM)

**EARS Pattern**: *Event-driven requirement*

**WHEN** a user initiates bulk import from Plex library
**THE SYSTEM** SHALL:
1. Fetch all TV shows from Plex library
2. Display shows with checkbox selection
3. Queue selected shows for sync
4. Process shows sequentially with progress indicator
5. Report sync results on completion

**SO THAT** users can import entire libraries efficiently.

---

### R3: RSS Feed Auto-Scheduling (MEDIUM)

**EARS Pattern**: *State-driven requirement*

**WHILE** RSS feed auto-refresh is enabled
**THE SYSTEM** SHALL automatically check feeds at configured intervals
**AND** import new items that pass filters
**WITHOUT** requiring manual intervention

**SO THAT** content is captured continuously.

**Scheduling Options**:
1. **Vercel Cron** (if deployed on Vercel)
2. **Railway Cron** (current hosting)
3. **Client-side polling** (fallback)

**Configuration**:
```typescript
interface FeedConfig {
  id: number;
  url: string;
  refreshInterval: number; // minutes
  lastRefreshed: Date;
  enabled: boolean;
  filters?: {
    titleContains?: string[];
    titleExcludes?: string[];
  };
}
```

---

### R4: RSS Feed Deduplication (LOW)

**EARS Pattern**: *Conditional requirement*

**IF** an RSS item has been previously imported
**THEN** the system SHALL skip importing that item
**BASED ON** the item's guid or canonical URL

**SO THAT** duplicate entries are prevented.

**Deduplication Logic**:
```typescript
async importItem(item: RSSItem): Promise<ImportResult> {
  // Check by guid first
  if (item.guid) {
    const existing = await this.findByGuid(item.guid);
    if (existing) return { skipped: true, reason: 'duplicate_guid' };
  }

  // Fallback to URL matching
  const normalizedUrl = normalizeUrl(item.link);
  const existingByUrl = await this.findByUrl(normalizedUrl);
  if (existingByUrl) return { skipped: true, reason: 'duplicate_url' };

  // Import new item
  return this.createItem(item);
}
```

---

## Specifications

### S1: File Modifications Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `lib/services/plex-episode-service.ts` | MODIFY - Implement syncFullShow | HIGH |
| `app/api/plex/sync/full/route.ts` | CREATE - Full sync endpoint | HIGH |
| `app/settings/plex/page.tsx` | MODIFY - Add bulk import UI | MEDIUM |
| `lib/services/rss-service.ts` | MODIFY - Add scheduling | MEDIUM |
| `app/api/cron/rss-refresh/route.ts` | CREATE - Cron endpoint | MEDIUM |

### S2: Plex API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/library/metadata/{ratingKey}` | Get show metadata |
| `/library/metadata/{ratingKey}/children` | Get seasons |
| `/library/metadata/{seasonKey}/children` | Get episodes |
| `/library/sections/{sectionId}/all` | Get all shows in library |

### S3: Database Schema (Existing)

```sql
-- tvshows table
CREATE TABLE tvshows (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  plex_rating_key VARCHAR(50),
  status VARCHAR(50),
  seasons INTEGER,
  -- ... other fields
);

-- rss_feeds table
CREATE TABLE rss_feeds (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  title VARCHAR(255),
  refresh_interval INTEGER DEFAULT 60, -- minutes
  last_refreshed TIMESTAMP,
  enabled BOOLEAN DEFAULT true,
  filters JSONB
);

-- rss_items table
CREATE TABLE rss_items (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER REFERENCES rss_feeds(id),
  guid TEXT,
  url TEXT NOT NULL,
  title VARCHAR(255),
  content TEXT,
  published_at TIMESTAMP,
  imported_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(feed_id, guid)
);
```

### S4: Cron Configuration

**Railway Cron** (railway.toml):
```toml
[[cron]]
name = "rss-refresh"
schedule = "*/30 * * * *"  # Every 30 minutes
command = "curl -X POST https://app-url/api/cron/rss-refresh"
```

**Vercel Cron** (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/rss-refresh",
    "schedule": "*/30 * * * *"
  }]
}
```

---

## Traceability

### Related Documentation

- **Plex API Docs**: https://support.plex.tv/articles/api/
- **Product Doc**: `.moai/project/product.md` - Media Module
- **Structure Doc**: `.moai/project/structure.md` - Integration Points

### Dependencies

- `SPEC-SECURITY-001` - Logging should be structured (credential handling)
- Plex server accessible and configured
- Railway/Vercel cron support for scheduling

### Success Metrics

- Full show sync completes within 2 minutes for typical show
- RSS feeds refresh on schedule with 99% reliability
- Zero duplicate RSS items after deduplication
- All watched episodes from Plex reflected in database

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial SPEC creation |
