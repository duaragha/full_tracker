# Plex API Integration - Backend Architecture

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Core Services](#core-services)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Security Considerations](#security-considerations)
7. [Error Handling & Edge Cases](#error-handling--edge-cases)
8. [External Service Integration](#external-service-integration)
9. [Configuration & Setup](#configuration--setup)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

### Architecture Philosophy
This integration follows a **one-way sync pattern** (Plex → Tracker only) with automatic show discovery and episode tracking. The system is designed to be:
- **Non-intrusive**: Works alongside existing manual tracking
- **Idempotent**: Handles duplicate webhooks gracefully
- **Resilient**: Continues working even when external APIs fail
- **User-controlled**: Requires user confirmation only when necessary

### Key Components
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    Plex     │────────>│  Webhook     │────────>│  Database   │
│   Server    │ webhook │  Handler     │  update │  (Postgres) │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │ fetch metadata
                              ▼
                        ┌──────────────┐
                        │  TMDB API    │
                        │  (existing)  │
                        └──────────────┘
```

---

## Database Schema

### 1. New Tables

#### `plex_config` - Stores user's Plex configuration
```sql
CREATE TABLE plex_config (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT 1, -- For future multi-user support
  plex_token TEXT NOT NULL, -- Encrypted
  plex_server_url TEXT, -- e.g., http://192.168.1.100:32400
  plex_server_name TEXT,
  plex_server_uuid TEXT,
  webhook_secret TEXT, -- For webhook verification
  enabled BOOLEAN DEFAULT true,
  auto_add_shows BOOLEAN DEFAULT true, -- Auto-add new shows from Plex
  auto_mark_watched BOOLEAN DEFAULT true, -- Auto-mark episodes as watched
  sync_started_date TIMESTAMP DEFAULT NOW(), -- When integration was enabled
  last_webhook_received TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Index for quick config lookup
CREATE INDEX idx_plex_config_user ON plex_config(user_id);
CREATE INDEX idx_plex_config_enabled ON plex_config(enabled) WHERE enabled = true;
```

#### `plex_show_mappings` - Maps Plex shows to tracker shows
```sql
CREATE TABLE plex_show_mappings (
  id SERIAL PRIMARY KEY,
  plex_rating_key TEXT NOT NULL, -- Plex's internal show ID
  plex_guid TEXT NOT NULL, -- e.g., plex://show/5d776b59ad5437001f79c6f8
  plex_title TEXT NOT NULL,
  plex_year INTEGER,

  -- External IDs extracted from Plex guid
  tvdb_id INTEGER,
  imdb_id TEXT,
  tmdb_id INTEGER,

  -- Mapping to our tracker
  tvshow_id INTEGER REFERENCES tvshows(id) ON DELETE CASCADE,

  -- Matching metadata
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00
  match_method TEXT, -- 'tmdb_id', 'tvdb_id', 'imdb_id', 'title_year'
  manually_confirmed BOOLEAN DEFAULT false,

  -- Sync control
  sync_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plex_rating_key),
  UNIQUE(plex_guid)
);

-- Indexes for mapping lookups
CREATE INDEX idx_plex_mappings_rating_key ON plex_show_mappings(plex_rating_key);
CREATE INDEX idx_plex_mappings_tvshow ON plex_show_mappings(tvshow_id);
CREATE INDEX idx_plex_mappings_tmdb ON plex_show_mappings(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX idx_plex_mappings_tvdb ON plex_show_mappings(tvdb_id) WHERE tvdb_id IS NOT NULL;
CREATE INDEX idx_plex_mappings_imdb ON plex_show_mappings(imdb_id) WHERE imdb_id IS NOT NULL;
CREATE INDEX idx_plex_mappings_sync_enabled ON plex_show_mappings(sync_enabled) WHERE sync_enabled = true;
```

#### `plex_webhook_logs` - Audit trail of webhook events
```sql
CREATE TABLE plex_webhook_logs (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'media.scrobble', 'media.play', etc.
  plex_rating_key TEXT,
  plex_title TEXT,
  plex_season INTEGER,
  plex_episode INTEGER,

  payload JSONB NOT NULL, -- Full webhook payload

  -- Processing status
  status TEXT NOT NULL, -- 'success', 'failed', 'ignored', 'duplicate'
  error_message TEXT,
  processing_duration_ms INTEGER,

  -- Resulting action
  action_taken TEXT, -- 'marked_watched', 'auto_added_show', 'needs_user_input', 'ignored'
  tvshow_id INTEGER REFERENCES tvshows(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Deduplication: same event within 5 minutes is likely duplicate
  UNIQUE(plex_rating_key, event_type, created_at)
);

-- Index for recent webhook lookups
CREATE INDEX idx_webhook_logs_created ON plex_webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON plex_webhook_logs(status);
CREATE INDEX idx_webhook_logs_rating_key ON plex_webhook_logs(plex_rating_key);

-- Partial index for failed events needing review
CREATE INDEX idx_webhook_logs_failed ON plex_webhook_logs(status, created_at DESC)
  WHERE status = 'failed';
```

#### `plex_conflicts` - Tracks matching conflicts requiring user resolution
```sql
CREATE TABLE plex_conflicts (
  id SERIAL PRIMARY KEY,
  plex_rating_key TEXT NOT NULL,
  plex_guid TEXT NOT NULL,
  plex_title TEXT NOT NULL,
  plex_year INTEGER,

  conflict_type TEXT NOT NULL, -- 'multiple_matches', 'no_match', 'ambiguous'

  -- Potential matches
  potential_matches JSONB, -- Array of {tvshow_id, title, tmdb_id, match_score}

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_tvshow_id INTEGER REFERENCES tvshows(id) ON DELETE CASCADE,
  resolved_at TIMESTAMP,
  resolution_action TEXT, -- 'user_selected', 'user_created_new', 'auto_resolved', 'ignored'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plex_rating_key, resolved)
);

-- Index for unresolved conflicts
CREATE INDEX idx_plex_conflicts_unresolved ON plex_conflicts(resolved, created_at DESC)
  WHERE resolved = false;
```

### 2. Updates to Existing Tables

#### Add Plex tracking to `tvshows` table
```sql
-- Add columns to track Plex sync source
ALTER TABLE tvshows
  ADD COLUMN IF NOT EXISTS plex_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS plex_last_sync TIMESTAMP,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'; -- 'manual', 'plex', 'import'

-- Index for Plex-synced shows
CREATE INDEX idx_tvshows_plex_synced ON tvshows(plex_synced) WHERE plex_synced = true;
```

---

## API Endpoints

### 1. Webhook Endpoint

#### `POST /api/plex/webhook`
Receives webhooks from Plex server.

**Security**:
- Optional webhook secret verification (Plex doesn't natively support HMAC, but we can use IP whitelist or custom secret in URL)
- Rate limiting: 100 requests/minute per IP

**Request Format**:
Plex sends as `multipart/form-data` with a JSON payload in the `payload` field.

```typescript
// After parsing multipart form data
interface PlexWebhookPayload {
  event: 'media.scrobble' | 'media.play' | 'media.pause' | 'media.resume' | 'media.stop' | 'library.new';
  user: boolean;
  owner: boolean;
  Account: {
    id: number;
    thumb: string;
    title: string;
  };
  Server: {
    title: string;
    uuid: string;
  };
  Player: {
    local: boolean;
    publicAddress: string;
    title: string;
    uuid: string;
  };
  Metadata: {
    librarySectionType: 'show' | 'movie' | 'music';
    ratingKey: string; // Plex's internal ID
    key: string;
    parentRatingKey: string; // Season
    grandparentRatingKey: string; // Show
    guid: string; // e.g., plex://show/5d776b59ad5437001f79c6f8
    type: 'episode' | 'show';
    title: string; // Episode title
    parentTitle: string; // Season name
    grandparentTitle: string; // Show name
    summary: string;
    index: number; // Episode number
    parentIndex: number; // Season number
    year: number;
    thumb: string;
    addedAt: number;
    updatedAt: number;
  };
}
```

**Response**:
```typescript
// Success
{ status: 'success', message: 'Webhook processed' }

// Error
{ status: 'error', message: 'Invalid payload', error: '...' }
```

**Processing Logic**:
1. Parse multipart form data
2. Extract JSON from `payload` field
3. Validate event type (only process `media.scrobble` and `library.new`)
4. Check if show is TV show (`librarySectionType === 'show'`)
5. Check for duplicate webhook (same ratingKey + event within 5 minutes)
6. Process based on event type
7. Log to `plex_webhook_logs`

---

### 2. Configuration Endpoints

#### `GET /api/plex/config`
Get current Plex configuration.

**Response**:
```typescript
{
  configured: boolean;
  enabled: boolean;
  autoAddShows: boolean;
  autoMarkWatched: boolean;
  serverName?: string;
  lastWebhookReceived?: string;
  webhookUrl: string; // Full webhook URL for user to configure in Plex
}
```

#### `POST /api/plex/config`
Save/update Plex configuration.

**Request**:
```typescript
{
  plexToken: string;
  plexServerUrl?: string; // Optional, can be auto-discovered
  autoAddShows?: boolean;
  autoMarkWatched?: boolean;
  enabled?: boolean;
}
```

**Processing**:
1. Encrypt Plex token before storing
2. Validate token by calling Plex API
3. Discover server URL if not provided
4. Generate webhook secret
5. Store in `plex_config` table

**Response**:
```typescript
{
  success: true;
  webhookUrl: string;
  serverName: string;
}
```

#### `DELETE /api/plex/config`
Disable Plex integration (soft delete - keeps mappings).

---

### 3. Mapping Management Endpoints

#### `GET /api/plex/mappings`
Get all Plex show mappings.

**Query Parameters**:
- `unmapped`: boolean - Show only unmapped Plex shows
- `conflicts`: boolean - Show only shows with conflicts

**Response**:
```typescript
{
  mappings: Array<{
    id: number;
    plexTitle: string;
    plexYear: number;
    tvshowId: number | null;
    tvshowTitle: string | null;
    matchConfidence: number;
    matchMethod: string;
    syncEnabled: boolean;
  }>;
}
```

#### `POST /api/plex/mappings/:mappingId/confirm`
Manually confirm or update a show mapping.

**Request**:
```typescript
{
  tvshowId: number; // Which show in tracker to map to
}
```

#### `DELETE /api/plex/mappings/:mappingId`
Disable sync for a specific show.

---

### 4. Conflict Resolution Endpoints

#### `GET /api/plex/conflicts`
Get all unresolved conflicts.

**Response**:
```typescript
{
  conflicts: Array<{
    id: number;
    plexTitle: string;
    plexYear: number;
    conflictType: string;
    potentialMatches: Array<{
      tvshowId: number;
      title: string;
      tmdbId: number;
      matchScore: number;
    }>;
    createdAt: string;
  }>;
}
```

#### `POST /api/plex/conflicts/:conflictId/resolve`
Resolve a conflict.

**Request**:
```typescript
{
  action: 'select' | 'create_new' | 'ignore';
  tvshowId?: number; // Required if action is 'select'
  createNew?: {
    tmdbId: number; // For creating new show
  };
}
```

---

### 5. Sync Status & Logs

#### `GET /api/plex/logs`
Get recent webhook processing logs.

**Query Parameters**:
- `limit`: number (default: 50, max: 200)
- `status`: 'success' | 'failed' | 'ignored'

**Response**:
```typescript
{
  logs: Array<{
    id: number;
    eventType: string;
    plexTitle: string;
    status: string;
    errorMessage?: string;
    actionTaken: string;
    createdAt: string;
  }>;
}
```

---

## Core Services

### 1. Webhook Processing Service

**Location**: `/lib/services/plex-webhook-service.ts`

```typescript
import { Pool } from 'pg';
import crypto from 'crypto';

export class PlexWebhookService {
  constructor(private pool: Pool) {}

  /**
   * Main webhook processor
   */
  async processWebhook(payload: PlexWebhookPayload): Promise<WebhookResult> {
    const startTime = Date.now();

    try {
      // 1. Validate payload
      this.validatePayload(payload);

      // 2. Check if event should be processed
      if (!this.shouldProcessEvent(payload)) {
        return { status: 'ignored', reason: 'Event type not supported' };
      }

      // 3. Check for duplicate
      const isDuplicate = await this.checkDuplicate(payload);
      if (isDuplicate) {
        return { status: 'duplicate', reason: 'Duplicate webhook received' };
      }

      // 4. Process based on event type
      let result: WebhookResult;
      switch (payload.event) {
        case 'media.scrobble':
          result = await this.handleScrobble(payload);
          break;
        case 'library.new':
          result = await this.handleLibraryNew(payload);
          break;
        default:
          result = { status: 'ignored', reason: 'Event type not handled' };
      }

      // 5. Log webhook
      await this.logWebhook(payload, result, Date.now() - startTime);

      return result;

    } catch (error) {
      const result = {
        status: 'failed',
        reason: error.message,
        error: error
      };
      await this.logWebhook(payload, result, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Handle media.scrobble event (episode marked as watched)
   */
  private async handleScrobble(payload: PlexWebhookPayload): Promise<WebhookResult> {
    const { Metadata } = payload;

    // Only process episodes
    if (Metadata.type !== 'episode') {
      return { status: 'ignored', reason: 'Not an episode' };
    }

    // 1. Find or create show mapping
    const mapping = await this.findOrCreateMapping(
      Metadata.grandparentRatingKey,
      Metadata.guid,
      Metadata.grandparentTitle,
      Metadata.year
    );

    if (!mapping.tvshow_id) {
      // Show not mapped yet, needs resolution
      return {
        status: 'needs_resolution',
        reason: 'Show not mapped to tracker',
        conflictId: mapping.conflictId
      };
    }

    // 2. Mark episode as watched
    await this.markEpisodeWatched(
      mapping.tvshow_id,
      Metadata.parentIndex, // season
      Metadata.index, // episode
      new Date().toISOString()
    );

    return {
      status: 'success',
      action: 'marked_watched',
      tvshowId: mapping.tvshow_id,
      season: Metadata.parentIndex,
      episode: Metadata.index
    };
  }

  /**
   * Handle library.new event (new show added to Plex)
   */
  private async handleLibraryNew(payload: PlexWebhookPayload): Promise<WebhookResult> {
    const { Metadata } = payload;

    // Only process shows
    if (Metadata.librarySectionType !== 'show') {
      return { status: 'ignored', reason: 'Not a TV show' };
    }

    // Check if auto-add is enabled
    const config = await this.getConfig();
    if (!config.auto_add_shows) {
      return { status: 'ignored', reason: 'Auto-add disabled' };
    }

    // Find or create show mapping (will create conflict if needed)
    const mapping = await this.findOrCreateMapping(
      Metadata.ratingKey,
      Metadata.guid,
      Metadata.title,
      Metadata.year
    );

    if (mapping.tvshow_id) {
      return {
        status: 'success',
        action: 'show_already_exists',
        tvshowId: mapping.tvshow_id
      };
    }

    return {
      status: 'needs_resolution',
      reason: 'New show needs mapping',
      conflictId: mapping.conflictId
    };
  }

  /**
   * Check for duplicate webhook within time window
   */
  private async checkDuplicate(payload: PlexWebhookPayload): Promise<boolean> {
    const { Metadata, event } = payload;
    const ratingKey = Metadata.ratingKey || Metadata.grandparentRatingKey;

    const result = await this.pool.query(`
      SELECT id FROM plex_webhook_logs
      WHERE plex_rating_key = $1
        AND event_type = $2
        AND created_at > NOW() - INTERVAL '5 minutes'
      LIMIT 1
    `, [ratingKey, event]);

    return result.rows.length > 0;
  }

  /**
   * Log webhook event
   */
  private async logWebhook(
    payload: PlexWebhookPayload,
    result: WebhookResult,
    durationMs: number
  ): Promise<void> {
    const { Metadata, event } = payload;

    await this.pool.query(`
      INSERT INTO plex_webhook_logs (
        event_type,
        plex_rating_key,
        plex_title,
        plex_season,
        plex_episode,
        payload,
        status,
        error_message,
        processing_duration_ms,
        action_taken,
        tvshow_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (plex_rating_key, event_type, created_at) DO NOTHING
    `, [
      event,
      Metadata.ratingKey || Metadata.grandparentRatingKey,
      Metadata.title || Metadata.grandparentTitle,
      Metadata.parentIndex,
      Metadata.index,
      JSON.stringify(payload),
      result.status,
      result.error?.message,
      durationMs,
      result.action,
      result.tvshowId
    ]);
  }

  private shouldProcessEvent(payload: PlexWebhookPayload): boolean {
    // Only process scrobble events and new library items
    return ['media.scrobble', 'library.new'].includes(payload.event);
  }

  private validatePayload(payload: PlexWebhookPayload): void {
    if (!payload.Metadata) {
      throw new Error('Missing Metadata in webhook payload');
    }
  }
}

interface WebhookResult {
  status: 'success' | 'failed' | 'ignored' | 'duplicate' | 'needs_resolution';
  reason?: string;
  error?: Error;
  action?: string;
  tvshowId?: number;
  season?: number;
  episode?: number;
  conflictId?: number;
}
```

---

### 2. Show Matching Service

**Location**: `/lib/services/plex-matching-service.ts`

```typescript
import { Pool } from 'pg';
import { getTVShowDetails } from '@/lib/api/tvshows';

export class PlexMatchingService {
  constructor(private pool: Pool) {}

  /**
   * Find or create mapping for a Plex show
   */
  async findOrCreateMapping(
    plexRatingKey: string,
    plexGuid: string,
    plexTitle: string,
    plexYear: number
  ): Promise<ShowMapping> {
    // 1. Check if mapping already exists
    const existing = await this.findExistingMapping(plexRatingKey);
    if (existing) {
      return existing;
    }

    // 2. Extract external IDs from Plex GUID
    const externalIds = this.extractExternalIds(plexGuid);

    // 3. Try to find match in tracker
    const matches = await this.findMatches(externalIds, plexTitle, plexYear);

    // 4. Evaluate matches
    if (matches.length === 0) {
      // No match found - create conflict
      const conflictId = await this.createConflict(
        plexRatingKey,
        plexGuid,
        plexTitle,
        plexYear,
        'no_match',
        []
      );
      return {
        plexRatingKey,
        plexGuid,
        tvshow_id: null,
        conflictId
      };
    }

    if (matches.length === 1 && matches[0].confidence >= 0.90) {
      // Single high-confidence match - auto-map
      const tvshowId = await this.createMapping(
        plexRatingKey,
        plexGuid,
        plexTitle,
        plexYear,
        externalIds,
        matches[0].tvshowId,
        matches[0].confidence,
        matches[0].method
      );
      return {
        plexRatingKey,
        plexGuid,
        tvshow_id: tvshowId,
        conflictId: null
      };
    }

    // Multiple matches or low confidence - create conflict
    const conflictId = await this.createConflict(
      plexRatingKey,
      plexGuid,
      plexTitle,
      plexYear,
      matches.length > 1 ? 'multiple_matches' : 'ambiguous',
      matches
    );
    return {
      plexRatingKey,
      plexGuid,
      tvshow_id: null,
      conflictId
    };
  }

  /**
   * Extract external IDs from Plex GUID
   * Examples:
   * - plex://show/5d776b59ad5437001f79c6f8
   * - com.plexapp.agents.thetvdb://121361?lang=en
   * - com.plexapp.agents.themoviedb://1418?lang=en
   * - com.plexapp.agents.imdb://tt0944947?lang=en
   */
  private extractExternalIds(guid: string): ExternalIds {
    const ids: ExternalIds = {};

    // TVDB
    const tvdbMatch = guid.match(/thetvdb:\/\/(\d+)/);
    if (tvdbMatch) {
      ids.tvdb_id = parseInt(tvdbMatch[1]);
    }

    // TMDB
    const tmdbMatch = guid.match(/themoviedb:\/\/(\d+)/);
    if (tmdbMatch) {
      ids.tmdb_id = parseInt(tmdbMatch[1]);
    }

    // IMDB
    const imdbMatch = guid.match(/imdb:\/\/(tt\d+)/);
    if (imdbMatch) {
      ids.imdb_id = imdbMatch[1];
    }

    return ids;
  }

  /**
   * Find matching shows in tracker
   */
  private async findMatches(
    externalIds: ExternalIds,
    title: string,
    year: number
  ): Promise<Match[]> {
    const matches: Match[] = [];

    // 1. Try exact TMDB ID match (highest confidence)
    if (externalIds.tmdb_id) {
      const result = await this.pool.query(
        'SELECT id, title, tmdb_id FROM tvshows WHERE tmdb_id = $1',
        [externalIds.tmdb_id]
      );
      if (result.rows.length > 0) {
        matches.push({
          tvshowId: result.rows[0].id,
          title: result.rows[0].title,
          confidence: 1.0,
          method: 'tmdb_id'
        });
        return matches; // Exact ID match, return immediately
      }
    }

    // 2. Try TVDB ID match via external API
    if (externalIds.tvdb_id) {
      const tmdbId = await this.getTMDBFromTVDB(externalIds.tvdb_id);
      if (tmdbId) {
        const result = await this.pool.query(
          'SELECT id, title, tmdb_id FROM tvshows WHERE tmdb_id = $1',
          [tmdbId]
        );
        if (result.rows.length > 0) {
          matches.push({
            tvshowId: result.rows[0].id,
            title: result.rows[0].title,
            confidence: 0.95,
            method: 'tvdb_id'
          });
          return matches;
        }
      }
    }

    // 3. Try IMDB ID match via external API
    if (externalIds.imdb_id) {
      const tmdbId = await this.getTMDBFromIMDB(externalIds.imdb_id);
      if (tmdbId) {
        const result = await this.pool.query(
          'SELECT id, title, tmdb_id FROM tvshows WHERE tmdb_id = $1',
          [tmdbId]
        );
        if (result.rows.length > 0) {
          matches.push({
            tvshowId: result.rows[0].id,
            title: result.rows[0].title,
            confidence: 0.95,
            method: 'imdb_id'
          });
          return matches;
        }
      }
    }

    // 4. Fuzzy title + year match
    const titleMatches = await this.findByTitleAndYear(title, year);
    matches.push(...titleMatches);

    return matches;
  }

  /**
   * Fuzzy match by title and year
   */
  private async findByTitleAndYear(title: string, year: number): Promise<Match[]> {
    // Use PostgreSQL's similarity functions (requires pg_trgm extension)
    const result = await this.pool.query(`
      SELECT
        id,
        title,
        tmdb_id,
        show_start_date,
        similarity(title, $1) as sim
      FROM tvshows
      WHERE
        similarity(title, $1) > 0.6
        AND (
          EXTRACT(YEAR FROM show_start_date) = $2
          OR EXTRACT(YEAR FROM show_start_date) = $2 - 1
          OR EXTRACT(YEAR FROM show_start_date) = $2 + 1
        )
      ORDER BY sim DESC
      LIMIT 5
    `, [title, year]);

    return result.rows.map(row => ({
      tvshowId: row.id,
      title: row.title,
      confidence: row.sim * 0.85, // Scale down confidence for fuzzy matches
      method: 'title_year'
    }));
  }

  /**
   * Get TMDB ID from TVDB ID
   */
  private async getTMDBFromTVDB(tvdbId: number): Promise<number | null> {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/find/${tvdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&external_source=tvdb_id`
      );
      const data = await response.json();
      return data.tv_results?.[0]?.id || null;
    } catch (error) {
      console.error('Error fetching TMDB from TVDB:', error);
      return null;
    }
  }

  /**
   * Get TMDB ID from IMDB ID
   */
  private async getTMDBFromIMDB(imdbId: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&external_source=imdb_id`
      );
      const data = await response.json();
      return data.tv_results?.[0]?.id || null;
    } catch (error) {
      console.error('Error fetching TMDB from IMDB:', error);
      return null;
    }
  }

  /**
   * Create a new show mapping
   */
  private async createMapping(
    plexRatingKey: string,
    plexGuid: string,
    plexTitle: string,
    plexYear: number,
    externalIds: ExternalIds,
    tvshowId: number,
    confidence: number,
    method: string
  ): Promise<number> {
    const result = await this.pool.query(`
      INSERT INTO plex_show_mappings (
        plex_rating_key,
        plex_guid,
        plex_title,
        plex_year,
        tvdb_id,
        imdb_id,
        tmdb_id,
        tvshow_id,
        match_confidence,
        match_method,
        manually_confirmed,
        sync_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      plexRatingKey,
      plexGuid,
      plexTitle,
      plexYear,
      externalIds.tvdb_id || null,
      externalIds.imdb_id || null,
      externalIds.tmdb_id || null,
      tvshowId,
      confidence,
      method,
      confidence >= 0.90, // Auto-confirm high confidence matches
      true
    ]);

    return result.rows[0].id;
  }

  /**
   * Create a conflict for user resolution
   */
  private async createConflict(
    plexRatingKey: string,
    plexGuid: string,
    plexTitle: string,
    plexYear: number,
    conflictType: string,
    matches: Match[]
  ): Promise<number> {
    const result = await this.pool.query(`
      INSERT INTO plex_conflicts (
        plex_rating_key,
        plex_guid,
        plex_title,
        plex_year,
        conflict_type,
        potential_matches
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (plex_rating_key, resolved) WHERE resolved = false
      DO UPDATE SET
        potential_matches = $6,
        updated_at = NOW()
      RETURNING id
    `, [
      plexRatingKey,
      plexGuid,
      plexTitle,
      plexYear,
      conflictType,
      JSON.stringify(matches)
    ]);

    return result.rows[0].id;
  }

  private async findExistingMapping(plexRatingKey: string): Promise<ShowMapping | null> {
    const result = await this.pool.query(
      'SELECT * FROM plex_show_mappings WHERE plex_rating_key = $1',
      [plexRatingKey]
    );

    if (result.rows.length === 0) return null;

    return {
      plexRatingKey: result.rows[0].plex_rating_key,
      plexGuid: result.rows[0].plex_guid,
      tvshow_id: result.rows[0].tvshow_id,
      conflictId: null
    };
  }
}

interface ExternalIds {
  tvdb_id?: number;
  tmdb_id?: number;
  imdb_id?: string;
}

interface Match {
  tvshowId: number;
  title: string;
  confidence: number;
  method: string;
}

interface ShowMapping {
  plexRatingKey: string;
  plexGuid: string;
  tvshow_id: number | null;
  conflictId: number | null;
}
```

---

### 3. Episode Tracking Service

**Location**: `/lib/services/plex-episode-service.ts`

```typescript
import { Pool } from 'pg';
import { markEpisodeWatched } from '@/lib/db/tvshows-store';

export class PlexEpisodeService {
  constructor(private pool: Pool) {}

  /**
   * Mark an episode as watched from Plex
   */
  async markEpisodeWatched(
    tvshowId: number,
    seasonNumber: number,
    episodeNumber: number,
    watchedDate: string
  ): Promise<void> {
    // Check if episode already marked as watched
    const show = await this.pool.query(
      'SELECT seasons FROM tvshows WHERE id = $1',
      [tvshowId]
    );

    if (show.rows.length === 0) {
      throw new Error(`Show not found: ${tvshowId}`);
    }

    const seasons = show.rows[0].seasons || [];
    const season = seasons.find((s: any) => s.seasonNumber === seasonNumber);

    if (!season) {
      console.warn(`Season ${seasonNumber} not found for show ${tvshowId}`);
      return;
    }

    const episode = season.episodes?.find((e: any) => e.episodeNumber === episodeNumber);

    if (!episode) {
      console.warn(`Episode ${seasonNumber}x${episodeNumber} not found for show ${tvshowId}`);
      return;
    }

    // Only update if not already watched (avoid overwriting manual watch dates)
    if (!episode.watched) {
      await markEpisodeWatched(tvshowId, seasonNumber, episodeNumber, true, watchedDate);
    }
  }

  /**
   * Sync all watched episodes from Plex for a show
   * (Used for initial sync or manual re-sync)
   */
  async syncShowProgress(
    plexRatingKey: string,
    plexToken: string,
    plexServerUrl: string
  ): Promise<void> {
    // Fetch watch progress from Plex
    const watchedEpisodes = await this.fetchPlexWatchedEpisodes(
      plexRatingKey,
      plexToken,
      plexServerUrl
    );

    // Get mapping
    const mapping = await this.pool.query(
      'SELECT tvshow_id FROM plex_show_mappings WHERE plex_rating_key = $1',
      [plexRatingKey]
    );

    if (mapping.rows.length === 0 || !mapping.rows[0].tvshow_id) {
      throw new Error('Show not mapped');
    }

    const tvshowId = mapping.rows[0].tvshow_id;

    // Mark episodes as watched
    for (const ep of watchedEpisodes) {
      await this.markEpisodeWatched(
        tvshowId,
        ep.seasonNumber,
        ep.episodeNumber,
        ep.watchedDate
      );
    }
  }

  /**
   * Fetch watched episodes from Plex API
   */
  private async fetchPlexWatchedEpisodes(
    ratingKey: string,
    token: string,
    serverUrl: string
  ): Promise<Array<{ seasonNumber: number; episodeNumber: number; watchedDate: string }>> {
    const url = `${serverUrl}/library/metadata/${ratingKey}/allLeaves?X-Plex-Token=${token}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Plex API error: ${response.statusText}`);
      }

      const data = await response.json();
      const episodes = data.MediaContainer?.Metadata || [];

      return episodes
        .filter((ep: any) => ep.viewCount > 0) // Only watched episodes
        .map((ep: any) => ({
          seasonNumber: ep.parentIndex,
          episodeNumber: ep.index,
          watchedDate: ep.lastViewedAt
            ? new Date(ep.lastViewedAt * 1000).toISOString()
            : new Date().toISOString()
        }));
    } catch (error) {
      console.error('Error fetching Plex episodes:', error);
      return [];
    }
  }
}
```

---

### 4. Encryption Service

**Location**: `/lib/services/encryption-service.ts`

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32-byte key
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class EncryptionService {
  /**
   * Encrypt sensitive data (e.g., Plex token)
   */
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

---

## Data Flow Diagrams

### 1. Webhook Processing Flow (Episode Watched)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Plex Webhook: media.scrobble                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  POST /api/plex/webhook                                              │
│  1. Parse multipart form data                                        │
│  2. Extract JSON payload                                             │
│  3. Validate signature (optional)                                    │
│  4. Rate limit check                                                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PlexWebhookService.processWebhook()                                 │
│  1. Validate payload structure                                       │
│  2. Check if TV show episode                                         │
│  3. Check for duplicate (within 5 min)                               │
│  4. Extract: grandparentRatingKey, guid, season, episode             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PlexMatchingService.findOrCreateMapping()                           │
│  Extract show info:                                                  │
│  - ratingKey: "12343"                                                │
│  - guid: "com.plexapp.agents.themoviedb://1418"                      │
│  - title: "The Office"                                               │
│  - year: 2005                                                        │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐    ┌───────────────────────┐
        │ Mapping Exists?   │    │ Extract External IDs   │
        │ Check DB:         │    │ from Plex GUID:        │
        │ plex_show_mappings│    │ - TMDB: 1418          │
        └─────┬─────────────┘    │ - TVDB: null          │
              │                  │ - IMDB: null          │
          Yes │                  └───────────┬───────────┘
              │                              │
              │                              ▼
              │                  ┌──────────────────────┐
              │                  │ Find Matches:        │
              │                  │ 1. Query tvshows     │
              │                  │    WHERE tmdb_id =   │
              │                  │    1418              │
              │                  └──────────┬───────────┘
              │                             │
              │                             ▼
              │                  ┌──────────────────────┐
              │                  │ Match Found?         │
              │                  │ - Single match       │
              │            No    │   confidence > 0.90  │
              ├──────────────────┤   → Auto-map         │
              │                  │ - Multiple/Low conf  │
              │                  │   → Create conflict  │
              │                  │ - No match           │
              │                  │   → Create conflict  │
              │                  └──────────┬───────────┘
              │                             │
              │                             │ Auto-mapped
              │                             ▼
              │                  ┌──────────────────────┐
              │                  │ INSERT INTO          │
              │                  │ plex_show_mappings   │
              │                  └──────────┬───────────┘
              │                             │
              └─────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  tvshow_id obtained (from mapping)                                   │
│  season: 2, episode: 3                                               │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PlexEpisodeService.markEpisodeWatched()                             │
│  1. Fetch show from tvshows table                                    │
│  2. Find season 2 in seasons JSON                                    │
│  3. Find episode 3 in season.episodes                                │
│  4. Check if already watched                                         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              Already Watched           Not Watched
                    │                         │
                    ▼                         ▼
            ┌───────────────┐      ┌──────────────────────┐
            │ Skip Update   │      │ markEpisodeWatched() │
            │ (preserve     │      │ from tvshows-store   │
            │ manual date)  │      │                      │
            └───────────────┘      │ 1. Set watched=true  │
                    │              │ 2. Set dateWatched   │
                    │              │ 3. Recalc totals     │
                    │              │ 4. UPDATE tvshows    │
                    │              └──────────┬───────────┘
                    │                         │
                    └────────────┬────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Log to plex_webhook_logs                                            │
│  - status: 'success'                                                 │
│  - action: 'marked_watched'                                          │
│  - duration_ms: 150                                                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
                          Return 200 OK
```

### 2. Conflict Resolution Flow

```
┌────────────────────────────────┐
│ User opens Plex settings page  │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│ GET /api/plex/conflicts        │
│ Returns unresolved conflicts   │
└────────────┬───────────────────┘
             │
             ▼
┌───────────────────────────────────────────────────────────┐
│ UI shows conflicts:                                        │
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Plex Show: "The Office" (2005)                     │   │
│ │ Conflict: Multiple possible matches                │   │
│ │                                                     │   │
│ │ Potential Matches:                                 │   │
│ │ [ ] The Office (US) - TMDB: 1418 (95% match)       │   │
│ │ [x] The Office (UK) - TMDB: 2316 (87% match)       │   │
│ │                                                     │   │
│ │ [Confirm Selection] [Create New] [Ignore]          │   │
│ └────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────┘
                        │ User clicks "Confirm Selection"
                        ▼
┌────────────────────────────────────────────────────────────┐
│ POST /api/plex/conflicts/:id/resolve                       │
│ {                                                          │
│   action: "select",                                        │
│   tvshowId: 42                                             │
│ }                                                          │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ 1. Update plex_conflicts:                                  │
│    - resolved = true                                       │
│    - resolved_tvshow_id = 42                               │
│    - resolution_action = 'user_selected'                   │
│                                                            │
│ 2. Create/Update plex_show_mappings:                       │
│    - tvshow_id = 42                                        │
│    - manually_confirmed = true                             │
│                                                            │
│ 3. Process any pending webhooks for this show              │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
       Return 200 OK
```

### 3. Auto-Add New Show Flow

```
┌──────────────────────────────┐
│ User starts watching new     │
│ show on Plex that's not in   │
│ tracker                      │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ Plex sends:                  │
│ event: "media.scrobble"      │
│ (or "library.new")           │
└────────────┬─────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ PlexMatchingService.findOrCreateMapping()                  │
│ No existing mapping found                                  │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ Try to match with existing shows in tracker                │
│ - Extract TMDB ID from Plex GUID                           │
│ - Query tvshows WHERE tmdb_id = ...                        │
└────────────┬───────────────────────────────────────────────┘
             │
   ┌─────────┴──────────┐
   │                    │
No Match          Match Found (confidence > 0.90)
   │                    │
   ▼                    ▼
┌────────────────┐  ┌────────────────────────┐
│ Check config:  │  │ Auto-map show          │
│ auto_add_shows │  │ Create mapping record  │
└────┬───────────┘  └────────┬───────────────┘
     │                       │
     │ enabled               │
     ▼                       │
┌────────────────────────────┐│
│ Fetch show details from    ││
│ TMDB API                   ││
└────────┬───────────────────┘│
         │                    │
         ▼                    │
┌────────────────────────────┐│
│ Create new show in tracker ││
│ INSERT INTO tvshows:       ││
│ - tmdb_id, title, etc.     ││
│ - status = 'Watching'      ││
│ - source = 'plex'          ││
│ - plex_synced = true       ││
└────────┬───────────────────┘│
         │                    │
         ▼                    │
┌────────────────────────────┐│
│ Create mapping:            ││
│ plex_show_mappings         ││
└────────┬───────────────────┘│
         │                    │
         └────────┬───────────┘
                  │
                  ▼
         Mark episode watched
```

---

## Security Considerations

### 1. Plex Token Security

**Storage**:
- Store encrypted in database using AES-256-GCM
- Encryption key stored in environment variable `ENCRYPTION_KEY`
- Never expose token in API responses
- Never log token in plaintext

**Generation**:
```bash
# Generate encryption key (run once, store in .env)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Environment Variables**:
```bash
ENCRYPTION_KEY=<64-character-hex-string>
```

### 2. Webhook Security

**Challenge**: Plex doesn't natively support HMAC webhook signatures.

**Solutions** (implement multiple layers):

#### Layer 1: Webhook Secret in URL
```
https://yourdomain.com/api/plex/webhook?secret=<random-secret>
```

Generate secret on config save:
```typescript
const webhookSecret = crypto.randomBytes(32).toString('hex');
```

#### Layer 2: IP Whitelist (Optional)
```typescript
const ALLOWED_IPS = [
  '127.0.0.1', // localhost
  '192.168.1.0/24', // local network
  // Add Plex server IP
];

function isAllowedIP(ip: string): boolean {
  // Check if IP is in whitelist
  return ALLOWED_IPS.some(allowedIP => {
    if (allowedIP.includes('/')) {
      // CIDR notation check
      return ipInCIDR(ip, allowedIP);
    }
    return ip === allowedIP;
  });
}
```

#### Layer 3: Rate Limiting
```typescript
// Using in-memory rate limiter (for single instance)
// For multi-instance, use Redis

import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### Layer 4: Payload Validation
```typescript
function validateWebhookPayload(payload: any): boolean {
  // Validate structure
  if (!payload.Metadata || !payload.event) return false;

  // Validate event type
  const validEvents = ['media.scrobble', 'media.play', 'library.new'];
  if (!validEvents.includes(payload.event)) return false;

  // Validate metadata
  if (payload.Metadata.type === 'episode') {
    if (!payload.Metadata.grandparentTitle) return false;
    if (typeof payload.Metadata.index !== 'number') return false;
    if (typeof payload.Metadata.parentIndex !== 'number') return false;
  }

  return true;
}
```

### 3. API Security

**Authentication**:
- Reuse existing auth mechanism (session-based or JWT)
- All Plex config endpoints require authentication
- Webhook endpoint is public but secured with secret

**Input Validation**:
```typescript
// Validate all user inputs
import { z } from 'zod';

const PlexConfigSchema = z.object({
  plexToken: z.string().min(20).max(200),
  plexServerUrl: z.string().url().optional(),
  autoAddShows: z.boolean().optional(),
  autoMarkWatched: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

// In API route
const body = PlexConfigSchema.parse(req.body);
```

**CORS**:
```typescript
// Only allow requests from your domain
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://yourdomain.com'
];
```

### 4. Database Security

**SQL Injection Prevention**:
- Always use parameterized queries (already implemented with pg)
- Never concatenate user input into SQL

**Least Privilege**:
- Database user should only have necessary permissions
- No DROP, ALTER permissions in production

---

## Error Handling & Edge Cases

### 1. Duplicate Webhooks

**Problem**: Plex may send the same webhook multiple times.

**Solution**:
```typescript
// Unique constraint on webhook logs with time window
CREATE UNIQUE INDEX idx_webhook_dedup ON plex_webhook_logs(
  plex_rating_key,
  event_type,
  (created_at::date),
  EXTRACT(HOUR FROM created_at),
  EXTRACT(MINUTE FROM created_at) / 5 -- 5-minute buckets
);

// In processing logic
const isDuplicate = await pool.query(`
  SELECT id FROM plex_webhook_logs
  WHERE plex_rating_key = $1
    AND event_type = $2
    AND created_at > NOW() - INTERVAL '5 minutes'
  LIMIT 1
`, [ratingKey, eventType]);

if (isDuplicate.rows.length > 0) {
  return { status: 'duplicate' };
}
```

### 2. Missing Metadata

**Problem**: Plex webhook might have incomplete metadata.

**Solution**:
```typescript
function validateMetadata(metadata: any): void {
  const required = ['ratingKey', 'guid', 'title'];
  const missing = required.filter(field => !metadata[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

// Graceful degradation
if (!metadata.year) {
  console.warn('Missing year in metadata, using current year');
  metadata.year = new Date().getFullYear();
}
```

### 3. External API Failures

**Problem**: TMDB API might be down or rate-limited.

**Solution**:
```typescript
async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  delay = 1000
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);

      if (response.ok) return response;

      // Rate limited
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        await sleep(retryAfter ? parseInt(retryAfter) * 1000 : delay * (i + 1));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * (i + 1));
    }
  }

  throw new Error('Max retries exceeded');
}

// Fallback strategy
try {
  const tmdbId = await getTMDBFromTVDB(tvdbId);
} catch (error) {
  console.error('TMDB API failed, using fuzzy match fallback');
  return await findByTitleAndYear(title, year);
}
```

### 4. Race Conditions

**Problem**: Multiple webhooks for same show arrive simultaneously.

**Solution**:
```typescript
// Use database transactions with row-level locking
async function findOrCreateMapping(/* ... */) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the row if it exists
    const existing = await client.query(`
      SELECT * FROM plex_show_mappings
      WHERE plex_rating_key = $1
      FOR UPDATE
    `, [plexRatingKey]);

    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return existing.rows[0];
    }

    // Create new mapping
    const result = await client.query(/* INSERT */);

    await client.query('COMMIT');
    return result.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 5. User Manually Marks Episode Before Webhook

**Problem**: User marks episode as watched in tracker, then Plex webhook arrives.

**Solution**:
```typescript
// Only update if not already watched
if (!episode.watched) {
  await markEpisodeWatched(/* ... */);
} else {
  console.log('Episode already marked as watched, preserving manual date');
}
```

### 6. Show Deleted from Tracker

**Problem**: User deletes show from tracker, but Plex keeps sending webhooks.

**Solution**:
```typescript
// plex_show_mappings has ON DELETE CASCADE
// When tvshow is deleted, mapping is automatically deleted

// In webhook processing
const mapping = await findMapping(plexRatingKey);
if (!mapping || !mapping.tvshow_id) {
  // Check if show was deleted
  const wasDeleted = await checkIfShowWasDeleted(plexRatingKey);
  if (wasDeleted) {
    // Recreate mapping with null tvshow_id, set sync_enabled = false
    await disableSyncForShow(plexRatingKey);
  }
}
```

### 7. Network Failures

**Problem**: Webhook request fails mid-processing.

**Solution**:
- Database transactions ensure atomicity
- Failed webhooks logged with status 'failed'
- Background job can retry failed webhooks

```typescript
// Background job (run every 5 minutes)
async function retryFailedWebhooks() {
  const failed = await pool.query(`
    SELECT * FROM plex_webhook_logs
    WHERE status = 'failed'
      AND created_at > NOW() - INTERVAL '1 hour'
      AND retry_count < 3
    ORDER BY created_at ASC
    LIMIT 10
  `);

  for (const log of failed.rows) {
    try {
      const payload = JSON.parse(log.payload);
      await processWebhook(payload);

      await pool.query(`
        UPDATE plex_webhook_logs
        SET status = 'success'
        WHERE id = $1
      `, [log.id]);
    } catch (error) {
      await pool.query(`
        UPDATE plex_webhook_logs
        SET retry_count = retry_count + 1
        WHERE id = $1
      `, [log.id]);
    }
  }
}
```

---

## External Service Integration

### 1. TMDB API (Existing)

**Already integrated** for TV show search and metadata.

**New Usage**: ID conversion
- `/find/{external_id}?external_source=tvdb_id`
- `/find/{external_id}?external_source=imdb_id`

**Rate Limits**: 40 requests/10 seconds

**Error Handling**:
```typescript
// Cache ID conversions to reduce API calls
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getTMDBFromTVDBCached(tvdbId: number): Promise<number | null> {
  const cached = await redis.get(`tvdb:${tvdbId}`);
  if (cached) return parseInt(cached);

  const tmdbId = await getTMDBFromTVDB(tvdbId);
  if (tmdbId) {
    await redis.setex(`tvdb:${tvdbId}`, CACHE_TTL / 1000, tmdbId.toString());
  }

  return tmdbId;
}
```

### 2. Plex API

**Authentication**: `X-Plex-Token` header or query parameter

**Key Endpoints**:

#### Get Show Metadata
```
GET /library/metadata/{ratingKey}?X-Plex-Token={token}
```

**Response**:
```json
{
  "MediaContainer": {
    "Metadata": [{
      "ratingKey": "12343",
      "guid": "com.plexapp.agents.themoviedb://1418",
      "title": "The Office",
      "year": 2005,
      "contentRating": "TV-14",
      "summary": "...",
      "childCount": 9 // number of seasons
    }]
  }
}
```

#### Get All Episodes for a Show
```
GET /library/metadata/{showRatingKey}/allLeaves?X-Plex-Token={token}
```

**Response**:
```json
{
  "MediaContainer": {
    "Metadata": [
      {
        "ratingKey": "12345",
        "parentRatingKey": "12344",
        "grandparentRatingKey": "12343",
        "type": "episode",
        "title": "Pilot",
        "index": 1, // episode number
        "parentIndex": 1, // season number
        "viewCount": 3,
        "lastViewedAt": 1698765432
      }
    ]
  }
}
```

#### Validate Plex Token
```
GET https://plex.tv/api/v2/user?X-Plex-Token={token}
```

**Usage**:
```typescript
async function validatePlexToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://plex.tv/api/v2/user?X-Plex-Token=${token}`,
      { headers: { 'Accept': 'application/json' } }
    );
    return response.ok;
  } catch {
    return false;
  }
}
```

### 3. PostgreSQL Full-Text Search

**Enable pg_trgm extension** for fuzzy matching:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for similarity search
CREATE INDEX idx_tvshows_title_trgm ON tvshows USING gin(title gin_trgm_ops);
```

**Usage**:
```sql
SELECT
  id,
  title,
  similarity(title, 'The Office') as sim
FROM tvshows
WHERE similarity(title, 'The Office') > 0.3
ORDER BY sim DESC;
```

---

## Configuration & Setup

### 1. Environment Variables

**Add to `.env.local`**:
```bash
# Existing
DATABASE_URL=postgresql://user:password@localhost:5432/full_tracker
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key

# New for Plex Integration
ENCRYPTION_KEY=<64-character-hex-string>  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PLEX_WEBHOOK_SECRET=<random-string>  # Auto-generated, stored in DB
PUBLIC_WEBHOOK_URL=https://yourdomain.com  # Your public domain for webhook URL

# Optional
PLEX_RATE_LIMIT=100  # Webhooks per minute
```

### 2. Database Migrations

**Create migration file**: `/db/migrations/020_add_plex_integration.sql`

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create tables (full schema from Database Schema section)
-- ...

-- Add fields to existing tables
ALTER TABLE tvshows
  ADD COLUMN IF NOT EXISTS plex_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS plex_last_sync TIMESTAMP,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Create indexes
-- ...
```

**Run migration**:
```bash
psql $DATABASE_URL < db/migrations/020_add_plex_integration.sql
```

### 3. Plex Server Configuration

**User Instructions** (to display in UI):

1. Get your Plex token:
   - Log into Plex Web App
   - Open any media item
   - Click "Get Info" (i icon)
   - Click "View XML"
   - Look for `X-Plex-Token` in the URL

2. Configure webhook in Plex:
   - Settings > Account > Webhooks
   - Add webhook URL: `https://yourdomain.com/api/plex/webhook?secret=<your-secret>`
   - Plex will send webhooks for all activity

3. In Tracker App:
   - Navigate to Settings > Plex Integration
   - Paste your Plex token
   - Enable "Auto-add shows" (optional)
   - Enable "Auto-mark watched" (optional)
   - Save configuration

### 4. UI Components Needed

#### Settings Page: `/app/settings/plex/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function PlexSettingsPage() {
  const [config, setConfig] = useState({
    plexToken: '',
    autoAddShows: true,
    autoMarkWatched: true,
    enabled: true
  });

  const [webhookUrl, setWebhookUrl] = useState('');

  const handleSave = async () => {
    const response = await fetch('/api/plex/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const data = await response.json();
    setWebhookUrl(data.webhookUrl);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plex Integration</CardTitle>
          <CardDescription>
            Automatically sync your Plex watch history with your TV show tracker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="token">Plex Token</Label>
            <Input
              id="token"
              type="password"
              value={config.plexToken}
              onChange={(e) => setConfig({...config, plexToken: e.target.value})}
              placeholder="Enter your Plex token"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Find your token in Plex Web App URL when viewing any media
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-add"
              checked={config.autoAddShows}
              onCheckedChange={(checked) => setConfig({...config, autoAddShows: checked})}
            />
            <Label htmlFor="auto-add">
              Automatically add new shows from Plex
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-watch"
              checked={config.autoMarkWatched}
              onCheckedChange={(checked) => setConfig({...config, autoMarkWatched: checked})}
            />
            <Label htmlFor="auto-watch">
              Automatically mark episodes as watched
            </Label>
          </div>

          <Button onClick={handleSave}>Save Configuration</Button>

          {webhookUrl && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium mb-2">Webhook URL (add to Plex):</p>
              <code className="text-sm bg-background p-2 rounded block">
                {webhookUrl}
              </code>
              <p className="text-sm text-muted-foreground mt-2">
                Add this URL in Plex: Settings → Account → Webhooks
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflicts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Conflicts</CardTitle>
          <CardDescription>
            Shows that need manual matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* List conflicts, allow user to resolve */}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Show recent webhook logs */}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Database migrations
  - Create all Plex tables
  - Add indexes
  - Enable pg_trgm extension
- [ ] Encryption service
  - Implement encrypt/decrypt functions
  - Generate encryption key
- [ ] Basic webhook endpoint
  - Parse multipart form data
  - Validate payload structure
  - Log to database

### Phase 2: Core Matching (Week 2)
- [ ] Plex matching service
  - Extract external IDs from GUID
  - Implement TMDB ID lookup
  - Fuzzy title matching
  - Confidence scoring
- [ ] Conflict management
  - Create conflicts for ambiguous matches
  - Database storage
- [ ] Episode tracking
  - Mark episodes as watched
  - Handle duplicates
  - Preserve manual dates

### Phase 3: Configuration & UI (Week 3)
- [ ] Configuration API endpoints
  - Save/update config
  - Validate Plex token
  - Generate webhook URL
- [ ] Settings UI
  - Plex token input
  - Enable/disable toggles
  - Webhook URL display
- [ ] Conflict resolution UI
  - List unresolved conflicts
  - Match selection interface
  - Create new show option

### Phase 4: Advanced Features (Week 4)
- [ ] Auto-add shows
  - Fetch show details from TMDB
  - Create show in tracker
  - Create mapping
- [ ] Bulk sync
  - Sync all watched episodes for a show
  - Progress indicator
- [ ] Monitoring & logs
  - Webhook logs viewer
  - Error tracking
  - Performance metrics

### Phase 5: Polish & Testing (Week 5)
- [ ] Error handling
  - Retry logic
  - Graceful degradation
  - User-friendly error messages
- [ ] Security hardening
  - Rate limiting
  - Input validation
  - SQL injection prevention
- [ ] Testing
  - Unit tests for services
  - Integration tests for webhooks
  - E2E tests for UI

### Phase 6: Documentation (Week 6)
- [ ] User guide
  - Setup instructions
  - Troubleshooting
  - FAQ
- [ ] Developer docs
  - API documentation
  - Service architecture
  - Deployment guide

---

## File Structure

```
/home/ragha/dev/projects/full_tracker/
├── app/
│   └── api/
│       └── plex/
│           ├── webhook/
│           │   └── route.ts          # POST /api/plex/webhook
│           ├── config/
│           │   └── route.ts          # GET/POST/DELETE /api/plex/config
│           ├── mappings/
│           │   ├── route.ts          # GET /api/plex/mappings
│           │   └── [id]/
│           │       └── route.ts      # POST/DELETE /api/plex/mappings/:id
│           ├── conflicts/
│           │   ├── route.ts          # GET /api/plex/conflicts
│           │   └── [id]/
│           │       └── resolve/
│           │           └── route.ts  # POST /api/plex/conflicts/:id/resolve
│           └── logs/
│               └── route.ts          # GET /api/plex/logs
├── lib/
│   ├── services/
│   │   ├── plex-webhook-service.ts   # Main webhook processor
│   │   ├── plex-matching-service.ts  # Show matching logic
│   │   ├── plex-episode-service.ts   # Episode tracking
│   │   └── encryption-service.ts     # Token encryption
│   └── db/
│       └── plex-store.ts             # Database queries for Plex
├── types/
│   └── plex.ts                       # TypeScript types
├── components/
│   └── plex/
│       ├── settings-form.tsx         # Plex config form
│       ├── conflict-resolver.tsx     # Conflict resolution UI
│       └── activity-log.tsx          # Webhook activity log
├── db/
│   └── migrations/
│       └── 020_add_plex_integration.sql
└── docs/
    └── PLEX_INTEGRATION_ARCHITECTURE.md  # This document
```

---

## Key Design Decisions

### 1. One-Way Sync Only
**Why**: Simpler, less error-prone, no risk of corrupting Plex data. Plex is source of truth.

### 2. Auto-Mapping with High Confidence Threshold
**Why**: Reduces user friction. Only require user input when genuinely ambiguous (< 90% confidence).

### 3. Store Full Webhook Payload
**Why**: Debugging, audit trail, ability to reprocess if matching algorithm improves.

### 4. Conflict-First Approach
**Why**: Better UX to show user conflicts upfront rather than silently failing or auto-mapping incorrectly.

### 5. Preserve Manual Watch Dates
**Why**: User might have watched episode before enabling Plex sync. Respect manual tracking.

### 6. Forward-Looking Only
**Why**: Avoids complexity of historical sync, prevents accidental data overwrites.

---

## Testing Strategy

### Unit Tests
```typescript
// lib/services/__tests__/plex-matching-service.test.ts

describe('PlexMatchingService', () => {
  it('should extract TMDB ID from Plex GUID', () => {
    const guid = 'com.plexapp.agents.themoviedb://1418?lang=en';
    const ids = extractExternalIds(guid);
    expect(ids.tmdb_id).toBe(1418);
  });

  it('should match by exact TMDB ID', async () => {
    // Mock database
    const matches = await findMatches({ tmdb_id: 1418 }, 'The Office', 2005);
    expect(matches[0].confidence).toBe(1.0);
  });

  it('should create conflict for multiple matches', async () => {
    // Mock multiple matches
    const result = await findOrCreateMapping(/* ... */);
    expect(result.conflictId).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// app/api/plex/webhook/__tests__/route.test.ts

describe('POST /api/plex/webhook', () => {
  it('should process scrobble event', async () => {
    const payload = createMockWebhookPayload('media.scrobble');
    const response = await POST(payload);
    expect(response.status).toBe(200);
  });

  it('should ignore duplicate webhooks', async () => {
    const payload = createMockWebhookPayload('media.scrobble');
    await POST(payload);
    const response = await POST(payload); // Send again
    expect(response.json()).toMatchObject({ status: 'duplicate' });
  });
});
```

### E2E Tests
```typescript
// tests/e2e/plex-integration.test.ts

describe('Plex Integration E2E', () => {
  it('should configure Plex and receive webhooks', async () => {
    // 1. Configure Plex
    await page.goto('/settings/plex');
    await page.fill('input[type="password"]', PLEX_TOKEN);
    await page.click('button:has-text("Save")');

    // 2. Simulate webhook
    await sendMockWebhook({
      event: 'media.scrobble',
      Metadata: {
        grandparentTitle: 'The Office',
        parentIndex: 1,
        index: 1
      }
    });

    // 3. Verify episode marked as watched
    await page.goto('/tvshows');
    await expect(page.locator('text=S01E01')).toHaveClass(/watched/);
  });
});
```

---

## Performance Considerations

### 1. Database Queries
- Use indexes extensively
- Batch inserts where possible
- Connection pooling (already configured)

### 2. Caching
```typescript
// Cache TMDB ID conversions
const idConversionCache = new Map<string, number>();

// Cache show mappings (invalidate on update)
const mappingCache = new Map<string, ShowMapping>();
```

### 3. Webhook Processing
- Process webhooks asynchronously
- Return 200 OK immediately
- Queue heavy operations

```typescript
// Quick response pattern
export async function POST(req: Request) {
  const payload = await parseWebhook(req);

  // Return immediately
  const response = NextResponse.json({ status: 'accepted' });

  // Process asynchronously
  processWebhookAsync(payload).catch(console.error);

  return response;
}
```

### 4. Rate Limiting
- Limit webhook endpoint: 100 req/min
- Limit TMDB API: 40 req/10s (already limited by TMDB)
- Implement exponential backoff for retries

---

## Monitoring & Observability

### Metrics to Track
```typescript
// Add to webhook logs table
- Processing duration (ms)
- Success rate
- Failure rate by error type
- Conflicts created
- Auto-mappings created

// Dashboard queries
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(processing_duration_ms) as avg_duration
FROM plex_webhook_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Alerts
- Failed webhooks > 10% in 1 hour
- Processing duration > 5 seconds
- TMDB API errors > 20% in 10 minutes
- Unresolved conflicts > 50

---

## Future Enhancements

### V2 Features
1. **Historical Sync**: Sync all past watches from Plex on initial setup
2. **Two-Way Sync**: Push watch status back to Plex (complex, low priority)
3. **Multi-User Support**: Support multiple Plex users
4. **Server Discovery**: Auto-discover Plex servers on local network
5. **Webhook Replay**: UI to manually replay failed webhooks
6. **Batch Operations**: Bulk resolve conflicts, bulk enable/disable sync
7. **Analytics**: Dashboard showing Plex sync statistics
8. **Smart Notifications**: Notify user when new shows detected
9. **Season Packs**: Auto-mark full seasons when Plex shows season complete
10. **Custom Mapping Rules**: User-defined mapping rules (regex, keywords)

### Performance Optimizations
1. **Redis Caching**: Cache mappings and ID conversions
2. **Background Jobs**: Move webhook processing to queue (Bull, BullMQ)
3. **Webhook Batching**: Batch process multiple webhooks together
4. **Incremental Sync**: Only sync changes since last sync

---

## Conclusion

This architecture provides a robust, scalable foundation for Plex integration that:
- Works seamlessly with existing TV show tracking
- Minimizes user intervention through smart auto-matching
- Handles edge cases gracefully
- Maintains security and data integrity
- Can be extended for future enhancements

The phased implementation approach ensures each component can be built, tested, and deployed independently, reducing risk and allowing for iterative improvements based on real-world usage.
