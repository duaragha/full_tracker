# SPEC-PLEX-001: Implementation Plan

<!-- TAG:SPEC-PLEX-001:PLAN -->

---

## Overview

This plan outlines the implementation strategy for completing Plex full show sync and RSS feed auto-scheduling features.

**Primary Goal**: Enable bulk import of TV shows from Plex
**Secondary Goal**: Automate RSS feed refresh

---

## Milestone 1: Plex Full Show Sync (Priority: HIGH)

### M1.1: Implement Plex API Client Methods

**File**: `lib/services/plex-episode-service.ts`

**Add Helper Methods**:

```typescript
// Fetch show metadata
private async fetchShowMetadata(ratingKey: string): Promise<PlexShow> {
  const response = await fetch(
    `${this.plexUrl}/library/metadata/${ratingKey}?X-Plex-Token=${this.plexToken}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch show: ${response.status}`);
  }

  const data = await response.json();
  return this.parseShowMetadata(data.MediaContainer.Metadata[0]);
}

// Fetch seasons for a show
private async fetchSeasons(showRatingKey: string): Promise<PlexSeason[]> {
  const response = await fetch(
    `${this.plexUrl}/library/metadata/${showRatingKey}/children?X-Plex-Token=${this.plexToken}`,
    { headers: { Accept: 'application/json' } }
  );

  const data = await response.json();
  return data.MediaContainer.Metadata.filter(
    (item: any) => item.type === 'season'
  ).map(this.parseSeasonMetadata);
}

// Fetch episodes for a season
private async fetchEpisodes(seasonRatingKey: string): Promise<PlexEpisode[]> {
  const response = await fetch(
    `${this.plexUrl}/library/metadata/${seasonRatingKey}/children?X-Plex-Token=${this.plexToken}`,
    { headers: { Accept: 'application/json' } }
  );

  const data = await response.json();
  return data.MediaContainer.Metadata.map(this.parseEpisodeMetadata);
}
```

### M1.2: Implement syncFullShow Method

**Replace TODO at line 221**:

```typescript
async syncFullShow(ratingKey: string): Promise<SyncResult> {
  const startTime = Date.now();
  let episodesProcessed = 0;
  let episodesCreated = 0;
  let episodesUpdated = 0;

  try {
    // 1. Fetch show metadata
    logger.info({ ratingKey }, 'Starting full show sync');
    const show = await this.fetchShowMetadata(ratingKey);

    // 2. Create or update show in database
    const dbShow = await this.upsertShow({
      title: show.title,
      plexRatingKey: ratingKey,
      year: show.year,
      summary: show.summary,
      thumb: show.thumb,
      status: 'watching', // Default status for synced shows
    });

    // 3. Fetch all seasons
    const seasons = await this.fetchSeasons(ratingKey);
    logger.info({ showId: dbShow.id, seasonCount: seasons.length }, 'Fetched seasons');

    // 4. Process each season
    for (const season of seasons) {
      if (season.index === 0) continue; // Skip specials for now

      const episodes = await this.fetchEpisodes(season.ratingKey);
      logger.debug({ seasonNumber: season.index, episodeCount: episodes.length }, 'Processing season');

      // 5. Process each episode
      for (const episode of episodes) {
        const result = await this.upsertEpisode(dbShow.id, {
          seasonNumber: season.index,
          episodeNumber: episode.index,
          title: episode.title,
          summary: episode.summary,
          airDate: episode.originallyAvailableAt,
          watched: episode.viewCount > 0,
          watchedAt: episode.lastViewedAt,
          plexRatingKey: episode.ratingKey,
        });

        episodesProcessed++;
        if (result.created) episodesCreated++;
        if (result.updated) episodesUpdated++;
      }

      // Small delay between seasons to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;
    logger.info({
      showId: dbShow.id,
      episodesProcessed,
      episodesCreated,
      episodesUpdated,
      durationMs: duration,
    }, 'Full show sync completed');

    return {
      success: true,
      showId: dbShow.id,
      episodesProcessed,
      episodesCreated,
      episodesUpdated,
      duration,
    };

  } catch (error) {
    logger.error({ error, ratingKey }, 'Full show sync failed');
    throw error;
  }
}
```

### M1.3: Create Sync API Endpoint

**File**: `app/api/plex/sync/full/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PlexEpisodeService } from '@/lib/services/plex-episode-service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { ratingKey } = await req.json();

    if (!ratingKey) {
      return NextResponse.json(
        { error: 'Missing ratingKey' },
        { status: 400 }
      );
    }

    const service = new PlexEpisodeService();
    const result = await service.syncFullShow(ratingKey);

    return NextResponse.json(result);

  } catch (error) {
    logger.error({ error }, 'Full sync endpoint error');
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### M1.4: Add Sync Button to UI

**File**: `app/settings/plex/page.tsx`

Add sync button in show list:

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => handleSyncShow(show.ratingKey)}
  disabled={syncing === show.ratingKey}
>
  {syncing === show.ratingKey ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <RefreshCw className="h-4 w-4" />
  )}
  Sync All
</Button>
```

---

## Milestone 2: Bulk Import UI (Priority: MEDIUM)

### M2.1: Create Library Browser Component

**File**: `components/plex/library-browser.tsx`

```typescript
interface LibraryBrowserProps {
  onImport: (ratingKeys: string[]) => void;
}

export function LibraryBrowser({ onImport }: LibraryBrowserProps) {
  const [shows, setShows] = useState<PlexShow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plex/library/shows')
      .then(res => res.json())
      .then(data => {
        setShows(data.shows);
        setLoading(false);
      });
  }, []);

  const toggleSelect = (ratingKey: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(ratingKey)) {
      newSelected.delete(ratingKey);
    } else {
      newSelected.add(ratingKey);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(shows.map(s => s.ratingKey)));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Plex TV Library</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={selectAll}>
            Select All
          </Button>
          <Button
            onClick={() => onImport(Array.from(selected))}
            disabled={selected.size === 0}
          >
            Import {selected.size} Shows
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {shows.map(show => (
          <Card
            key={show.ratingKey}
            className={cn(
              'cursor-pointer transition-colors',
              selected.has(show.ratingKey) && 'ring-2 ring-primary'
            )}
            onClick={() => toggleSelect(show.ratingKey)}
          >
            <CardContent className="p-2">
              {show.thumb && (
                <img
                  src={`/api/plex/thumb?path=${encodeURIComponent(show.thumb)}`}
                  alt={show.title}
                  className="w-full aspect-[2/3] object-cover rounded"
                />
              )}
              <p className="text-sm mt-2 truncate">{show.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### M2.2: Create Bulk Import Handler

**File**: `app/api/plex/sync/bulk/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { ratingKeys } = await req.json();

  if (!Array.isArray(ratingKeys) || ratingKeys.length === 0) {
    return NextResponse.json({ error: 'No shows selected' }, { status: 400 });
  }

  const results: SyncResult[] = [];
  const service = new PlexEpisodeService();

  for (const ratingKey of ratingKeys) {
    try {
      const result = await service.syncFullShow(ratingKey);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        ratingKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    total: ratingKeys.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  });
}
```

---

## Milestone 3: RSS Auto-Scheduling (Priority: MEDIUM)

### M3.1: Add Refresh Interval to Feed Config

**Update Feed Creation/Edit**:

```typescript
interface CreateFeedInput {
  url: string;
  title?: string;
  refreshInterval: number; // minutes
  enabled: boolean;
  filters?: FeedFilters;
}
```

### M3.2: Create Cron Endpoint

**File**: `app/api/cron/rss-refresh/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { RSSService } from '@/lib/services/rss-service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  // Verify cron secret (Railway/Vercel cron authentication)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const service = new RSSService();
    const feeds = await service.getFeedsDueForRefresh();

    logger.info({ feedCount: feeds.length }, 'Starting RSS refresh cron');

    const results = [];
    for (const feed of feeds) {
      try {
        const result = await service.refreshFeed(feed.id);
        results.push({ feedId: feed.id, success: true, newItems: result.newItems });
      } catch (error) {
        logger.error({ feedId: feed.id, error }, 'Feed refresh failed');
        results.push({ feedId: feed.id, success: false, error: error.message });
      }
    }

    return NextResponse.json({
      feedsProcessed: feeds.length,
      results,
    });

  } catch (error) {
    logger.error({ error }, 'RSS refresh cron failed');
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

// Also support GET for manual trigger
export async function GET(req: NextRequest) {
  return POST(req);
}
```

### M3.3: Add getFeedsDueForRefresh Method

**File**: `lib/services/rss-service.ts`

```typescript
async getFeedsDueForRefresh(): Promise<RSSFeed[]> {
  const result = await pool.query(`
    SELECT * FROM rss_feeds
    WHERE enabled = true
    AND (
      last_refreshed IS NULL
      OR last_refreshed + (refresh_interval * INTERVAL '1 minute') < NOW()
    )
    ORDER BY last_refreshed ASC NULLS FIRST
    LIMIT 10
  `);

  return result.rows;
}
```

### M3.4: Configure Railway Cron

**File**: `railway.toml` (create or update)

```toml
[build]
builder = "NIXPACKS"

[[cron]]
name = "rss-refresh"
schedule = "*/30 * * * *"
command = "curl -X POST -H 'Authorization: Bearer $CRON_SECRET' $RAILWAY_PUBLIC_DOMAIN/api/cron/rss-refresh"
```

---

## Milestone 4: RSS Deduplication (Priority: LOW)

### M4.1: Enhance Import Logic

**File**: `lib/services/rss-service.ts`

```typescript
async importItem(feedId: number, item: ParsedRSSItem): Promise<ImportResult> {
  // 1. Check by guid (most reliable)
  if (item.guid) {
    const existing = await this.findItemByGuid(feedId, item.guid);
    if (existing) {
      return { imported: false, reason: 'duplicate_guid', existingId: existing.id };
    }
  }

  // 2. Check by normalized URL
  const normalizedUrl = this.normalizeUrl(item.link);
  const existingByUrl = await this.findItemByUrl(feedId, normalizedUrl);
  if (existingByUrl) {
    return { imported: false, reason: 'duplicate_url', existingId: existingByUrl.id };
  }

  // 3. Check by title + date (fuzzy duplicate detection)
  const existingByTitleDate = await this.findSimilarItem(feedId, item.title, item.pubDate);
  if (existingByTitleDate) {
    return { imported: false, reason: 'likely_duplicate', existingId: existingByTitleDate.id };
  }

  // 4. Import new item
  const result = await pool.query(`
    INSERT INTO rss_items (feed_id, guid, url, title, content, published_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [feedId, item.guid, normalizedUrl, item.title, item.content, item.pubDate]);

  return { imported: true, itemId: result.rows[0].id };
}

private normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'].forEach(param => {
      parsed.searchParams.delete(param);
    });
    // Normalize to lowercase hostname
    return parsed.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Plex API rate limiting | Low | Medium | Add delays between requests |
| Long-running sync timeout | Medium | High | Chunk large imports |
| RSS feed parsing failures | Medium | Low | Error handling per feed |
| Cron not triggering | Low | Medium | Manual fallback, monitoring |

---

## Verification Checklist

### Plex Sync
- [ ] Single show sync works
- [ ] All episodes imported with watch status
- [ ] Bulk import processes multiple shows
- [ ] Progress indicator accurate

### RSS Scheduling
- [ ] Cron endpoint accessible
- [ ] Feeds refresh on schedule
- [ ] New items imported
- [ ] Duplicates skipped

### Deduplication
- [ ] GUID duplicates detected
- [ ] URL duplicates detected
- [ ] Similar title/date handled

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial plan creation |
