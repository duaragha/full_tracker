/**
 * Audible Integration Type Definitions
 *
 * These types match the database schema and Python service responses
 */

// ============================================
// DATABASE MODELS
// ============================================

export interface AudibleConfig {
  id: number;
  user_id: number;
  email: string;
  country_code: string;
  access_token: string | null;
  refresh_token: string | null;
  device_serial: string | null;
  token_expires_at: Date | null;
  last_auth_at: Date | null;
  enabled: boolean;
  auto_sync_progress: boolean;
  sync_interval_minutes: number;
  last_sync_at: Date | null;
  sync_count_today: number;
  last_sync_reset_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AudibleBookMapping {
  id: number;
  asin: string;
  audible_title: string;
  audible_author: string | null;
  audible_narrator: string | null;
  audible_runtime_minutes: number | null;
  audible_cover_url: string | null;
  audible_release_date: Date | null;
  book_id: number | null;
  match_confidence: number | null;
  match_method: 'isbn' | 'title_author' | 'manual' | null;
  manually_confirmed: boolean;
  sync_enabled: boolean;
  last_known_position_seconds: number;
  last_known_percentage: number;
  audible_is_finished: boolean;
  last_synced_from_audible: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AudibleSyncLog {
  id: number;
  sync_type: 'manual' | 'scheduled' | 'webhook';
  trigger_source: string | null;
  status: 'success' | 'partial' | 'failed';
  books_synced: number;
  books_updated: number;
  books_failed: number;
  duration_ms: number | null;
  api_calls_made: number;
  error_message: string | null;
  error_stack: string | null;
  sync_details: SyncDetails | null;
  created_at: Date;
}

export interface SyncDetails {
  updated: Array<{
    asin: string;
    title: string;
    oldProgress: number;
    newProgress: number;
  }>;
  errors: Array<{
    asin: string;
    title: string;
    error: string;
  }>;
  new_books?: Array<{
    asin: string;
    title: string;
  }>;
}

export interface AudibleConflict {
  id: number;
  asin: string;
  audible_title: string;
  audible_author: string | null;
  conflict_type: 'multiple_matches' | 'no_match' | 'type_mismatch';
  potential_matches: PotentialMatch[];
  resolved: boolean;
  resolved_book_id: number | null;
  resolved_at: Date | null;
  resolution_action: 'user_selected' | 'user_created_new' | 'auto_resolved' | 'ignored' | null;
  created_at: Date;
  updated_at: Date;
}

export interface PotentialMatch {
  bookId: number;
  title: string;
  author: string | null;
  type: string;
  matchScore: number;
}

export interface AudibleProgressHistory {
  id: number;
  mapping_id: number;
  asin: string;
  position_seconds: number;
  percentage: number;
  is_finished: boolean;
  sync_log_id: number | null;
  created_at: Date;
}

// ============================================
// PYTHON SERVICE REQUEST/RESPONSE TYPES
// ============================================

export interface AudibleAuthRequest {
  email: string;
  password: string;
  country_code: string;
}

export interface AudibleAuthResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  device_serial?: string;
  expires_at?: string; // ISO timestamp
  error?: string;
}

export interface AudibleLibraryRequest {
  access_token: string;
  refresh_token: string;
  country_code: string;
}

export interface AudibleLibraryItem {
  asin: string;
  title: string;
  authors: string[];
  narrators: string[];
  runtime_length_min: number;
  cover_url: string;
  release_date: string | null;
  percent_complete: number; // 0-100
  position_seconds: number;
  is_finished: boolean;
  isbn?: string;
}

export interface AudibleLibraryResponse {
  success: boolean;
  books?: AudibleLibraryItem[];
  total_count?: number;
  error?: string;
  needs_auth?: boolean; // Token expired
}

export interface AudibleProgressRequest {
  access_token: string;
  refresh_token: string;
  country_code: string;
  asin: string;
}

export interface AudibleProgressResponse {
  success: boolean;
  asin?: string;
  position_seconds?: number;
  percent_complete?: number;
  is_finished?: boolean;
  error?: string;
  needs_auth?: boolean;
}

// ============================================
// API ENDPOINT TYPES
// ============================================

// POST /api/audible/auth
export interface AuthenticateAudibleRequest {
  email: string;
  password: string;
  country_code: string;
}

export interface AuthenticateAudibleResponse {
  success: boolean;
  message: string;
  config_id?: number;
  error?: string;
}

// GET /api/audible/config
export interface GetAudibleConfigResponse {
  configured: boolean;
  config?: {
    email: string;
    country_code: string;
    enabled: boolean;
    auto_sync_progress: boolean;
    sync_interval_minutes: number;
    last_sync_at: string | null;
    token_expires_at: string | null;
  };
}

// PUT /api/audible/config
export interface UpdateAudibleConfigRequest {
  enabled?: boolean;
  auto_sync_progress?: boolean;
  sync_interval_minutes?: number;
}

export interface UpdateAudibleConfigResponse {
  success: boolean;
  message: string;
  config?: AudibleConfig;
}

// POST /api/audible/sync
export interface SyncAudibleRequest {
  force?: boolean; // Bypass rate limiting
  asin?: string; // Sync specific book only
}

export interface SyncAudibleResponse {
  success: boolean;
  status: 'success' | 'partial' | 'failed';
  books_synced: number;
  books_updated: number;
  new_mappings: number;
  conflicts: number;
  duration_ms: number;
  next_sync_allowed?: string; // ISO timestamp
  error?: string;
  details?: SyncDetails;
}

// GET /api/audible/status
export interface GetAudibleStatusResponse {
  can_sync: boolean;
  reason: string;
  next_allowed_sync: string | null; // ISO timestamp
  syncs_remaining_today: number;
  last_sync?: {
    status: string;
    books_synced: number;
    created_at: string;
  };
  stats: {
    total_mappings: number;
    mapped: number;
    unmapped: number;
    currently_reading: number;
  };
}

// POST /api/audible/link
export interface LinkAudibleBookRequest {
  asin: string;
  book_id?: number; // Link to existing book
  create_new?: boolean; // Create new book entry
  book_data?: {
    title: string;
    author: string;
    type: 'Audiobook';
    status: string;
  };
}

export interface LinkAudibleBookResponse {
  success: boolean;
  message: string;
  mapping_id?: number;
  book_id?: number;
  conflict_id?: number; // If conflict needs resolution
}

// GET /api/audible/mappings
export interface GetAudibleMappingsResponse {
  mappings: Array<{
    id: number;
    asin: string;
    audible_title: string;
    audible_author: string | null;
    progress_percentage: number;
    is_finished: boolean;
    book_id: number | null;
    book_title: string | null;
    match_confidence: number | null;
    sync_enabled: boolean;
    last_synced: string | null;
  }>;
  total: number;
}

// GET /api/audible/conflicts
export interface GetAudibleConflictsResponse {
  conflicts: Array<{
    id: number;
    asin: string;
    audible_title: string;
    audible_author: string | null;
    conflict_type: string;
    potential_matches: PotentialMatch[];
    created_at: string;
  }>;
  total: number;
}

// POST /api/audible/conflicts/:id/resolve
export interface ResolveAudibleConflictRequest {
  book_id?: number; // Select existing book
  create_new?: boolean; // Create new book
  ignore?: boolean; // Ignore this conflict
  book_data?: {
    title: string;
    author: string;
    type: 'Audiobook';
    status: string;
  };
}

export interface ResolveAudibleConflictResponse {
  success: boolean;
  message: string;
  mapping_id?: number;
  book_id?: number;
}

// GET /api/audible/logs
export interface GetAudibleLogsResponse {
  logs: Array<{
    id: number;
    sync_type: string;
    status: string;
    books_synced: number;
    books_updated: number;
    duration_ms: number | null;
    created_at: string;
    error_message: string | null;
  }>;
  total: number;
}

// GET /api/audible/progress/:asin
export interface GetAudibleProgressResponse {
  success: boolean;
  asin: string;
  current_progress: {
    position_seconds: number;
    percentage: number;
    is_finished: boolean;
    last_synced: string | null;
  };
  history: Array<{
    position_seconds: number;
    percentage: number;
    created_at: string;
  }>;
  mapping?: {
    audible_title: string;
    runtime_minutes: number;
    book_id: number | null;
  };
}

// ============================================
// SERVICE TYPES
// ============================================

export interface SyncResult {
  success: boolean;
  booksProcessed: number;
  booksUpdated: number;
  newMappings: number;
  conflicts: number;
  errors: Array<{
    asin: string;
    error: string;
  }>;
  details: SyncDetails;
}

export interface MatchResult {
  bookId: number | null;
  needsConflict: boolean;
  conflictId?: number;
  confidence?: number;
  method?: string;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason: string;
  nextAllowedSync: Date | null;
  syncsRemainingToday: number;
}

// ============================================
// HELPER TYPES
// ============================================

export type AudibleCountryCode = 'us' | 'uk' | 'ca' | 'au' | 'fr' | 'de' | 'jp' | 'it' | 'in' | 'es';

export const AUDIBLE_COUNTRY_CODES: Record<AudibleCountryCode, string> = {
  us: 'United States',
  uk: 'United Kingdom',
  ca: 'Canada',
  au: 'Australia',
  fr: 'France',
  de: 'Germany',
  jp: 'Japan',
  it: 'Italy',
  in: 'India',
  es: 'Spain',
};

export const DEFAULT_SYNC_INTERVAL = 60; // minutes
export const MIN_SYNC_INTERVAL = 15; // minutes
export const MAX_SYNCS_PER_DAY = 600; // ~10 per minute sustained
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 10;
