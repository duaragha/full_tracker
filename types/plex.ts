// Plex Integration Type Definitions

// ============================================
// Plex Webhook Types
// ============================================

export interface PlexWebhookPayload {
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
  Metadata: PlexMetadata;
}

export interface PlexMetadata {
  librarySectionType: 'show' | 'movie' | 'music';
  ratingKey: string; // Plex's internal ID
  key: string;
  parentRatingKey?: string; // Season
  grandparentRatingKey?: string; // Show
  guid: string; // e.g., plex://show/5d776b59ad5437001f79c6f8 or com.plexapp.agents.themoviedb://1418
  type: 'episode' | 'show' | 'season' | 'movie';
  title: string; // Episode title or show title
  parentTitle?: string; // Season name
  grandparentTitle?: string; // Show name
  summary?: string;
  index?: number; // Episode number
  parentIndex?: number; // Season number
  year?: number;
  thumb?: string;
  addedAt?: number;
  updatedAt?: number;
}

export interface WebhookResult {
  status: 'success' | 'failed' | 'ignored' | 'duplicate' | 'needs_resolution';
  reason?: string;
  error?: Error;
  action?: string;
  tvshowId?: number;
  season?: number;
  episode?: number;
  conflictId?: number;
}

// ============================================
// Plex API Response Types
// ============================================

export interface PlexShowMetadata {
  ratingKey: string;
  guid: string;
  title: string;
  year?: number;
  contentRating?: string;
  summary?: string;
  childCount?: number; // number of seasons
  thumb?: string;
  art?: string;
}

export interface PlexEpisodeMetadata {
  ratingKey: string;
  parentRatingKey: string; // Season
  grandparentRatingKey: string; // Show
  type: 'episode';
  title: string;
  index: number; // episode number
  parentIndex: number; // season number
  viewCount?: number;
  lastViewedAt?: number; // Unix timestamp
  duration?: number; // milliseconds
  addedAt?: number;
  updatedAt?: number;
}

export interface PlexMediaContainer<T> {
  MediaContainer: {
    size: number;
    Metadata: T[];
  };
}

// ============================================
// Database Models
// ============================================

export interface PlexConfig {
  id: number;
  user_id: number;
  plex_token: string; // Encrypted
  plex_server_url: string | null;
  plex_server_name: string | null;
  plex_server_uuid: string | null;
  webhook_secret: string;
  enabled: boolean;
  auto_add_shows: boolean;
  auto_mark_watched: boolean;
  sync_started_date: Date;
  last_webhook_received: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PlexShowMapping {
  id: number;
  plex_rating_key: string;
  plex_guid: string;
  plex_title: string;
  plex_year: number | null;
  tvdb_id: number | null;
  imdb_id: string | null;
  tmdb_id: number | null;
  tvshow_id: number | null;
  match_confidence: number | null; // 0.00 to 1.00
  match_method: string | null; // 'tmdb_id', 'tvdb_id', 'imdb_id', 'title_year'
  manually_confirmed: boolean;
  sync_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PlexWebhookLog {
  id: number;
  event_type: string;
  plex_rating_key: string | null;
  plex_title: string | null;
  plex_season: number | null;
  plex_episode: number | null;
  payload: Record<string, any>;
  status: 'success' | 'failed' | 'ignored' | 'duplicate';
  error_message: string | null;
  processing_duration_ms: number | null;
  action_taken: string | null; // 'marked_watched', 'auto_added_show', 'needs_user_input', 'ignored'
  tvshow_id: number | null;
  created_at: Date;
}

export interface PlexConflict {
  id: number;
  plex_rating_key: string;
  plex_guid: string;
  plex_title: string;
  plex_year: number | null;
  conflict_type: 'multiple_matches' | 'no_match' | 'ambiguous';
  potential_matches: PotentialMatch[];
  resolved: boolean;
  resolved_tvshow_id: number | null;
  resolved_at: Date | null;
  resolution_action: string | null; // 'user_selected', 'user_created_new', 'auto_resolved', 'ignored'
  created_at: Date;
  updated_at: Date;
}

export interface PotentialMatch {
  tvshowId: number;
  title: string;
  tmdbId?: number;
  matchScore: number;
  year?: number;
  network?: string;
}

// ============================================
// Service Types
// ============================================

export interface ExternalIds {
  tvdb_id?: number;
  tmdb_id?: number;
  imdb_id?: string;
}

export interface Match {
  tvshowId: number;
  title: string;
  confidence: number; // 0.00 to 1.00
  method: 'tmdb_id' | 'tvdb_id' | 'imdb_id' | 'title_year';
  tmdbId?: number;
  year?: number;
}

export interface ShowMapping {
  plexRatingKey: string;
  plexGuid: string;
  tvshow_id: number | null;
  conflictId: number | null;
}

// ============================================
// API Request/Response Types
// ============================================

export interface PlexConfigRequest {
  plexToken: string;
  plexServerUrl?: string;
  autoAddShows?: boolean;
  autoMarkWatched?: boolean;
  enabled?: boolean;
}

export interface PlexConfigResponse {
  configured: boolean;
  enabled: boolean;
  autoAddShows: boolean;
  autoMarkWatched: boolean;
  serverName?: string;
  lastWebhookReceived?: string;
  webhookUrl: string;
}

export interface PlexMappingResponse {
  id: number;
  plexTitle: string;
  plexYear: number | null;
  tvshowId: number | null;
  tvshowTitle: string | null;
  matchConfidence: number | null;
  matchMethod: string | null;
  syncEnabled: boolean;
  manuallyConfirmed: boolean;
}

export interface PlexConflictResponse {
  id: number;
  plexTitle: string;
  plexYear: number | null;
  conflictType: string;
  potentialMatches: PotentialMatch[];
  createdAt: string;
}

export interface ResolveConflictRequest {
  action: 'select' | 'create_new' | 'ignore';
  tvshowId?: number; // Required if action is 'select'
  createNew?: {
    tmdbId: number;
  };
}

export interface PlexLogResponse {
  id: number;
  eventType: string;
  plexTitle: string | null;
  status: string;
  errorMessage?: string;
  actionTaken: string | null;
  createdAt: string;
  season?: number;
  episode?: number;
}

// ============================================
// Utility Types
// ============================================

export type PlexEventType =
  | 'media.scrobble'
  | 'media.play'
  | 'media.pause'
  | 'media.resume'
  | 'media.stop'
  | 'library.new';

export type WebhookStatus = 'success' | 'failed' | 'ignored' | 'duplicate';

export type ConflictType = 'multiple_matches' | 'no_match' | 'ambiguous';

export type ResolutionAction = 'user_selected' | 'user_created_new' | 'auto_resolved' | 'ignored';

export type MatchMethod = 'tmdb_id' | 'tvdb_id' | 'imdb_id' | 'title_year';
