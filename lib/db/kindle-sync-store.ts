import { db } from '@/lib/db'

export interface KindleSyncSettings {
  id: number
  amazonEmail: string | null
  amazonPasswordEncrypted: string | null
  autoSyncEnabled: boolean
  syncFrequency: 'manual' | 'hourly' | '6hours' | 'daily' | 'weekly'
  lastSyncAt: string | null
  lastSyncStatus: 'success' | 'failed' | 'in_progress' | 'never' | null
  lastSyncError: string | null
  lastSyncHighlightsCount: number
  lastSyncNewHighlightsCount: number
  lastSyncNewBooksCount: number
  isConnected: boolean
  connectionVerifiedAt: string | null
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface KindleSyncHistory {
  id: number
  syncType: 'manual' | 'automatic' | 'scheduled'
  highlightsProcessed: number
  highlightsImported: number
  highlightsSkipped: number
  booksCreated: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  errorMessage: string | null
  metadata: Record<string, any>
  startedAt: string
  completedAt: string | null
  durationSeconds: number | null
  createdAt: string
}

/**
 * Get or create Kindle sync settings (singleton pattern)
 */
export async function getKindleSyncSettings(): Promise<KindleSyncSettings | null> {
  const result = await db.query(`
    SELECT
      id,
      amazon_email as "amazonEmail",
      amazon_password_encrypted as "amazonPasswordEncrypted",
      auto_sync_enabled as "autoSyncEnabled",
      sync_frequency as "syncFrequency",
      last_sync_at as "lastSyncAt",
      last_sync_status as "lastSyncStatus",
      last_sync_error as "lastSyncError",
      last_sync_highlights_count as "lastSyncHighlightsCount",
      last_sync_new_highlights_count as "lastSyncNewHighlightsCount",
      last_sync_new_books_count as "lastSyncNewBooksCount",
      is_connected as "isConnected",
      connection_verified_at as "connectionVerifiedAt",
      metadata,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM kindle_sync_settings
    ORDER BY id DESC
    LIMIT 1
  `)

  return result.rows[0] || null
}

/**
 * Create or update Kindle sync settings
 */
export async function upsertKindleSyncSettings(settings: {
  amazonEmail?: string
  amazonPasswordEncrypted?: string
  autoSyncEnabled?: boolean
  syncFrequency?: 'manual' | 'hourly' | '6hours' | 'daily' | 'weekly'
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'failed' | 'in_progress' | 'never'
  lastSyncError?: string | null
  lastSyncHighlightsCount?: number
  lastSyncNewHighlightsCount?: number
  lastSyncNewBooksCount?: number
  isConnected?: boolean
  connectionVerifiedAt?: string
  metadata?: Record<string, any>
}): Promise<KindleSyncSettings> {
  // First, get existing settings
  const existing = await getKindleSyncSettings()

  if (existing) {
    // Update existing
    const result = await db.query(
      `
      UPDATE kindle_sync_settings
      SET
        amazon_email = COALESCE($1, amazon_email),
        amazon_password_encrypted = COALESCE($2, amazon_password_encrypted),
        auto_sync_enabled = COALESCE($3, auto_sync_enabled),
        sync_frequency = COALESCE($4, sync_frequency),
        last_sync_at = COALESCE($5, last_sync_at),
        last_sync_status = COALESCE($6, last_sync_status),
        last_sync_error = $7,
        last_sync_highlights_count = COALESCE($8, last_sync_highlights_count),
        last_sync_new_highlights_count = COALESCE($9, last_sync_new_highlights_count),
        last_sync_new_books_count = COALESCE($10, last_sync_new_books_count),
        is_connected = COALESCE($11, is_connected),
        connection_verified_at = COALESCE($12, connection_verified_at),
        metadata = COALESCE($13, metadata)
      WHERE id = $14
      RETURNING
        id,
        amazon_email as "amazonEmail",
        amazon_password_encrypted as "amazonPasswordEncrypted",
        auto_sync_enabled as "autoSyncEnabled",
        sync_frequency as "syncFrequency",
        last_sync_at as "lastSyncAt",
        last_sync_status as "lastSyncStatus",
        last_sync_error as "lastSyncError",
        last_sync_highlights_count as "lastSyncHighlightsCount",
        last_sync_new_highlights_count as "lastSyncNewHighlightsCount",
        last_sync_new_books_count as "lastSyncNewBooksCount",
        is_connected as "isConnected",
        connection_verified_at as "connectionVerifiedAt",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      `,
      [
        settings.amazonEmail,
        settings.amazonPasswordEncrypted,
        settings.autoSyncEnabled,
        settings.syncFrequency,
        settings.lastSyncAt,
        settings.lastSyncStatus,
        settings.lastSyncError,
        settings.lastSyncHighlightsCount,
        settings.lastSyncNewHighlightsCount,
        settings.lastSyncNewBooksCount,
        settings.isConnected,
        settings.connectionVerifiedAt,
        settings.metadata ? JSON.stringify(settings.metadata) : null,
        existing.id,
      ]
    )
    return result.rows[0]
  } else {
    // Create new
    const result = await db.query(
      `
      INSERT INTO kindle_sync_settings (
        amazon_email,
        amazon_password_encrypted,
        auto_sync_enabled,
        sync_frequency,
        last_sync_at,
        last_sync_status,
        last_sync_error,
        last_sync_highlights_count,
        last_sync_new_highlights_count,
        last_sync_new_books_count,
        is_connected,
        connection_verified_at,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        id,
        amazon_email as "amazonEmail",
        amazon_password_encrypted as "amazonPasswordEncrypted",
        auto_sync_enabled as "autoSyncEnabled",
        sync_frequency as "syncFrequency",
        last_sync_at as "lastSyncAt",
        last_sync_status as "lastSyncStatus",
        last_sync_error as "lastSyncError",
        last_sync_highlights_count as "lastSyncHighlightsCount",
        last_sync_new_highlights_count as "lastSyncNewHighlightsCount",
        last_sync_new_books_count as "lastSyncNewBooksCount",
        is_connected as "isConnected",
        connection_verified_at as "connectionVerifiedAt",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      `,
      [
        settings.amazonEmail || null,
        settings.amazonPasswordEncrypted || null,
        settings.autoSyncEnabled ?? false,
        settings.syncFrequency || 'manual',
        settings.lastSyncAt || null,
        settings.lastSyncStatus || 'never',
        settings.lastSyncError || null,
        settings.lastSyncHighlightsCount || 0,
        settings.lastSyncNewHighlightsCount || 0,
        settings.lastSyncNewBooksCount || 0,
        settings.isConnected ?? false,
        settings.connectionVerifiedAt || null,
        settings.metadata ? JSON.stringify(settings.metadata) : '{}',
      ]
    )
    return result.rows[0]
  }
}

/**
 * Delete Kindle sync settings (disconnect)
 */
export async function deleteKindleSyncSettings(): Promise<void> {
  await db.query('DELETE FROM kindle_sync_settings')
}

/**
 * Create a new sync history entry
 */
export async function createKindleSyncHistory(history: {
  syncType: 'manual' | 'automatic' | 'scheduled'
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  highlightsProcessed?: number
  highlightsImported?: number
  highlightsSkipped?: number
  booksCreated?: number
  errorMessage?: string | null
  metadata?: Record<string, any>
}): Promise<KindleSyncHistory> {
  const result = await db.query(
    `
    INSERT INTO kindle_sync_history (
      sync_type,
      status,
      highlights_processed,
      highlights_imported,
      highlights_skipped,
      books_created,
      error_message,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id,
      sync_type as "syncType",
      highlights_processed as "highlightsProcessed",
      highlights_imported as "highlightsImported",
      highlights_skipped as "highlightsSkipped",
      books_created as "booksCreated",
      status,
      error_message as "errorMessage",
      metadata,
      started_at as "startedAt",
      completed_at as "completedAt",
      duration_seconds as "durationSeconds",
      created_at as "createdAt"
    `,
    [
      history.syncType,
      history.status || 'pending',
      history.highlightsProcessed || 0,
      history.highlightsImported || 0,
      history.highlightsSkipped || 0,
      history.booksCreated || 0,
      history.errorMessage || null,
      history.metadata ? JSON.stringify(history.metadata) : '{}',
    ]
  )

  return result.rows[0]
}

/**
 * Update sync history entry
 */
export async function updateKindleSyncHistory(
  id: number,
  updates: {
    status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
    highlightsProcessed?: number
    highlightsImported?: number
    highlightsSkipped?: number
    booksCreated?: number
    errorMessage?: string | null
    completedAt?: string
    durationSeconds?: number
    metadata?: Record<string, any>
  }
): Promise<KindleSyncHistory> {
  const result = await db.query(
    `
    UPDATE kindle_sync_history
    SET
      status = COALESCE($1, status),
      highlights_processed = COALESCE($2, highlights_processed),
      highlights_imported = COALESCE($3, highlights_imported),
      highlights_skipped = COALESCE($4, highlights_skipped),
      books_created = COALESCE($5, books_created),
      error_message = $6,
      completed_at = COALESCE($7, completed_at),
      duration_seconds = COALESCE($8, duration_seconds),
      metadata = COALESCE($9, metadata)
    WHERE id = $10
    RETURNING
      id,
      sync_type as "syncType",
      highlights_processed as "highlightsProcessed",
      highlights_imported as "highlightsImported",
      highlights_skipped as "highlightsSkipped",
      books_created as "booksCreated",
      status,
      error_message as "errorMessage",
      metadata,
      started_at as "startedAt",
      completed_at as "completedAt",
      duration_seconds as "durationSeconds",
      created_at as "createdAt"
    `,
    [
      updates.status,
      updates.highlightsProcessed,
      updates.highlightsImported,
      updates.highlightsSkipped,
      updates.booksCreated,
      updates.errorMessage,
      updates.completedAt,
      updates.durationSeconds,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      id,
    ]
  )

  return result.rows[0]
}

/**
 * Get recent sync history
 */
export async function getRecentKindleSyncHistory(limit: number = 10): Promise<KindleSyncHistory[]> {
  const result = await db.query(
    `
    SELECT
      id,
      sync_type as "syncType",
      highlights_processed as "highlightsProcessed",
      highlights_imported as "highlightsImported",
      highlights_skipped as "highlightsSkipped",
      books_created as "booksCreated",
      status,
      error_message as "errorMessage",
      metadata,
      started_at as "startedAt",
      completed_at as "completedAt",
      duration_seconds as "durationSeconds",
      created_at as "createdAt"
    FROM kindle_sync_history
    ORDER BY started_at DESC
    LIMIT $1
    `,
    [limit]
  )

  return result.rows
}
