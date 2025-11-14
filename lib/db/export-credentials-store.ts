// ============================================
// Export Credentials Database Store
// Manage OAuth credentials for export integrations
// ============================================

import { db } from '@/lib/db'
import { OAuthCredential } from '@/lib/exporters/types'

export interface CreateCredentialDTO {
  provider: 'onenote' | 'notion' | 'evernote' | 'google_drive' | 'dropbox'
  accessToken: string
  refreshToken?: string
  tokenType?: string
  expiresAt?: Date
  userId?: string
  userEmail?: string
  userName?: string
  scopes?: string[]
  metadata?: any
}

export interface UpdateCredentialDTO {
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  isActive?: boolean
  metadata?: any
}

/**
 * Get credential by provider
 */
export async function getCredentialByProvider(
  provider: string
): Promise<OAuthCredential | null> {
  const result = await db.query(
    `SELECT
      id, provider, access_token, refresh_token, token_type,
      expires_at, user_id, user_email, user_name, scopes,
      is_active, metadata, created_at, updated_at
    FROM export_credentials
    WHERE provider = $1 AND is_active = TRUE
    LIMIT 1`,
    [provider]
  )

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToCredential(result.rows[0])
}

/**
 * Get all active credentials
 */
export async function getActiveCredentials(): Promise<OAuthCredential[]> {
  const result = await db.query(
    `SELECT
      id, provider, access_token, refresh_token, token_type,
      expires_at, user_id, user_email, user_name, scopes,
      is_active, metadata, created_at, updated_at
    FROM export_credentials
    WHERE is_active = TRUE
    ORDER BY provider`
  )

  return result.rows.map(mapRowToCredential)
}

/**
 * Create or update credential
 */
export async function upsertCredential(
  credential: CreateCredentialDTO
): Promise<OAuthCredential> {
  // First, deactivate any existing credentials for this provider
  await db.query(
    `UPDATE export_credentials
    SET is_active = FALSE, updated_at = NOW()
    WHERE provider = $1 AND is_active = TRUE`,
    [credential.provider]
  )

  // Insert new credential
  const result = await db.query(
    `INSERT INTO export_credentials (
      provider, access_token, refresh_token, token_type,
      expires_at, user_id, user_email, user_name, scopes,
      is_active, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING
      id, provider, access_token, refresh_token, token_type,
      expires_at, user_id, user_email, user_name, scopes,
      is_active, metadata, created_at, updated_at`,
    [
      credential.provider,
      credential.accessToken,
      credential.refreshToken || null,
      credential.tokenType || 'Bearer',
      credential.expiresAt || null,
      credential.userId || null,
      credential.userEmail || null,
      credential.userName || null,
      credential.scopes || null,
      true,
      credential.metadata || null
    ]
  )

  return mapRowToCredential(result.rows[0])
}

/**
 * Update credential
 */
export async function updateCredential(
  provider: string,
  updates: UpdateCredentialDTO
): Promise<OAuthCredential | null> {
  const setClauses: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (updates.accessToken !== undefined) {
    setClauses.push(`access_token = $${paramCount++}`)
    values.push(updates.accessToken)
  }

  if (updates.refreshToken !== undefined) {
    setClauses.push(`refresh_token = $${paramCount++}`)
    values.push(updates.refreshToken)
  }

  if (updates.expiresAt !== undefined) {
    setClauses.push(`expires_at = $${paramCount++}`)
    values.push(updates.expiresAt)
  }

  if (updates.isActive !== undefined) {
    setClauses.push(`is_active = $${paramCount++}`)
    values.push(updates.isActive)
  }

  if (updates.metadata !== undefined) {
    setClauses.push(`metadata = $${paramCount++}`)
    values.push(JSON.stringify(updates.metadata))
  }

  if (setClauses.length === 0) {
    return await getCredentialByProvider(provider)
  }

  setClauses.push(`updated_at = NOW()`)
  values.push(provider)

  const result = await db.query(
    `UPDATE export_credentials
    SET ${setClauses.join(', ')}
    WHERE provider = $${paramCount} AND is_active = TRUE
    RETURNING
      id, provider, access_token, refresh_token, token_type,
      expires_at, user_id, user_email, user_name, scopes,
      is_active, metadata, created_at, updated_at`,
    values
  )

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToCredential(result.rows[0])
}

/**
 * Delete credential
 */
export async function deleteCredential(provider: string): Promise<void> {
  await db.query(
    `DELETE FROM export_credentials WHERE provider = $1`,
    [provider]
  )
}

/**
 * Deactivate credential
 */
export async function deactivateCredential(provider: string): Promise<void> {
  await db.query(
    `UPDATE export_credentials
    SET is_active = FALSE, updated_at = NOW()
    WHERE provider = $1`,
    [provider]
  )
}

/**
 * Check if token is expired or about to expire
 */
export async function isCredentialExpired(
  provider: string,
  bufferSeconds: number = 300
): Promise<boolean> {
  const credential = await getCredentialByProvider(provider)

  if (!credential || !credential.expiresAt) {
    return true
  }

  const expiryTime = new Date(credential.expiresAt).getTime()
  const now = Date.now()
  const buffer = bufferSeconds * 1000

  return expiryTime - buffer < now
}

/**
 * Get credentials expiring soon
 */
export async function getExpiringCredentials(
  withinHours: number = 24
): Promise<OAuthCredential[]> {
  const result = await db.query(
    `SELECT
      id, provider, access_token, refresh_token, token_type,
      expires_at, user_id, user_email, user_name, scopes,
      is_active, metadata, created_at, updated_at
    FROM export_credentials
    WHERE is_active = TRUE
      AND expires_at IS NOT NULL
      AND expires_at < NOW() + INTERVAL '${withinHours} hours'
    ORDER BY expires_at ASC`
  )

  return result.rows.map(mapRowToCredential)
}

/**
 * Map database row to OAuthCredential object
 */
function mapRowToCredential(row: any): OAuthCredential {
  return {
    id: row.id,
    provider: row.provider,
    accessToken: row.access_token,
    refreshToken: row.refresh_token || undefined,
    tokenType: row.token_type,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    userId: row.user_id || undefined,
    userEmail: row.user_email || undefined,
    userName: row.user_name || undefined,
    scopes: row.scopes || undefined,
    isActive: row.is_active,
    metadata: row.metadata || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}
