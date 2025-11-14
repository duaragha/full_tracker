import { Pool } from 'pg'
import { EncryptionService } from '@/lib/services/encryption-service'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export interface AmazonCredentials {
  id: number
  email: string  // Decrypted
  password: string  // Decrypted
  lastSyncAt?: Date | null
  lastSyncStatus?: 'success' | 'failed' | 'in_progress' | null
  lastSyncError?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EncryptedCredentials {
  encryptedEmail: string
  encryptedPassword: string
  iv: string
}

/**
 * Save encrypted Amazon credentials to database
 *
 * @param email - Plain Amazon email address
 * @param password - Plain Amazon password
 * @param userId - Optional user ID for multi-user support
 * @returns Saved credentials with metadata
 */
export async function saveCredentials(
  email: string,
  password: string,
  userId?: number
): Promise<{ id: number; success: boolean }> {
  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  // Encrypt credentials using separate encryptions (each has own IV)
  const encryptedEmail = EncryptionService.encrypt(email)
  const encryptedPassword = EncryptionService.encrypt(password)

  // Extract IV from the first encryption for storage reference
  // Note: Each field stores its own IV in the encrypted format (iv:authTag:encrypted)
  const iv = EncryptionService.generateSecret(16) // Store a reference IV

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Check if credentials already exist
    const existingResult = await client.query(
      'SELECT id FROM amazon_credentials WHERE user_id IS NOT DISTINCT FROM $1',
      [userId || null]
    )

    let result

    if (existingResult.rows.length > 0) {
      // Update existing credentials
      result = await client.query(
        `UPDATE amazon_credentials
         SET encrypted_email = $1,
             encrypted_password = $2,
             iv = $3,
             updated_at = NOW()
         WHERE user_id IS NOT DISTINCT FROM $4
         RETURNING id`,
        [encryptedEmail, encryptedPassword, iv, userId || null]
      )
    } else {
      // Insert new credentials
      result = await client.query(
        `INSERT INTO amazon_credentials (
          encrypted_email,
          encrypted_password,
          iv,
          user_id,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id`,
        [encryptedEmail, encryptedPassword, iv, userId || null]
      )
    }

    await client.query('COMMIT')

    return {
      id: result.rows[0].id,
      success: true,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error saving Amazon credentials:', error)
    throw new Error('Failed to save credentials')
  } finally {
    client.release()
  }
}

/**
 * Get decrypted Amazon credentials from database
 *
 * @param userId - Optional user ID for multi-user support
 * @returns Decrypted credentials or null if not found
 */
export async function getCredentials(userId?: number): Promise<AmazonCredentials | null> {
  const result = await pool.query(
    `SELECT
      id,
      encrypted_email,
      encrypted_password,
      last_sync_at,
      last_sync_status,
      last_sync_error,
      created_at,
      updated_at
    FROM amazon_credentials
    WHERE user_id IS NOT DISTINCT FROM $1`,
    [userId || null]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]

  try {
    // Decrypt credentials
    const email = EncryptionService.decrypt(row.encrypted_email)
    const password = EncryptionService.decrypt(row.encrypted_password)

    return {
      id: row.id,
      email,
      password,
      lastSyncAt: row.last_sync_at,
      lastSyncStatus: row.last_sync_status,
      lastSyncError: row.last_sync_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (error) {
    console.error('Error decrypting Amazon credentials:', error)
    throw new Error('Failed to decrypt credentials. Please re-enter your credentials.')
  }
}

/**
 * Check if credentials exist
 *
 * @param userId - Optional user ID for multi-user support
 * @returns True if credentials exist
 */
export async function hasCredentials(userId?: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM amazon_credentials WHERE user_id IS NOT DISTINCT FROM $1',
    [userId || null]
  )

  return result.rows.length > 0
}

/**
 * Delete Amazon credentials from database
 *
 * @param userId - Optional user ID for multi-user support
 * @returns True if deleted successfully
 */
export async function deleteCredentials(userId?: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM amazon_credentials WHERE user_id IS NOT DISTINCT FROM $1 RETURNING id',
    [userId || null]
  )

  return result.rows.length > 0
}

/**
 * Update sync status
 *
 * @param status - Sync status
 * @param error - Optional error message
 * @param userId - Optional user ID
 */
export async function updateSyncStatus(
  status: 'success' | 'failed' | 'in_progress',
  error?: string,
  userId?: number
): Promise<void> {
  await pool.query(
    `UPDATE amazon_credentials
     SET last_sync_at = NOW(),
         last_sync_status = $1,
         last_sync_error = $2,
         updated_at = NOW()
     WHERE user_id IS NOT DISTINCT FROM $3`,
    [status, error || null, userId || null]
  )
}

/**
 * Get sync logs with pagination
 *
 * @param limit - Number of logs to return
 * @param offset - Offset for pagination
 * @returns Array of sync logs
 */
export async function getSyncLogs(limit = 10, offset = 0) {
  const result = await pool.query(
    `SELECT
      id,
      status,
      highlights_imported,
      sources_created,
      duplicates_skipped,
      error_message,
      error_details,
      books_processed,
      duration_seconds,
      started_at,
      completed_at,
      created_at
    FROM kindle_sync_logs
    ORDER BY started_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  return result.rows.map(row => ({
    id: row.id,
    status: row.status,
    highlightsImported: row.highlights_imported,
    sourcesCreated: row.sources_created,
    duplicatesSkipped: row.duplicates_skipped,
    errorMessage: row.error_message,
    errorDetails: row.error_details,
    booksProcessed: row.books_processed,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }))
}

/**
 * Get the most recent sync log
 *
 * @returns Most recent sync log or null
 */
export async function getLastSyncLog() {
  const result = await pool.query(
    `SELECT
      id,
      status,
      highlights_imported,
      sources_created,
      duplicates_skipped,
      error_message,
      error_details,
      books_processed,
      duration_seconds,
      started_at,
      completed_at,
      created_at
    FROM kindle_sync_logs
    ORDER BY started_at DESC
    LIMIT 1`
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    status: row.status,
    highlightsImported: row.highlights_imported,
    sourcesCreated: row.sources_created,
    duplicatesSkipped: row.duplicates_skipped,
    errorMessage: row.error_message,
    errorDetails: row.error_details,
    booksProcessed: row.books_processed,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }
}

/**
 * Create a new sync log entry
 *
 * @param status - Initial status
 * @returns Log ID
 */
export async function createSyncLog(status: 'in_progress' | 'success' | 'failed' = 'in_progress'): Promise<number> {
  const result = await pool.query(
    `INSERT INTO kindle_sync_logs (
      status,
      started_at,
      created_at
    ) VALUES ($1, NOW(), NOW())
    RETURNING id`,
    [status]
  )

  return result.rows[0].id
}

/**
 * Update sync log with results
 *
 * @param logId - Log ID
 * @param updates - Updates to apply
 */
export async function updateSyncLog(
  logId: number,
  updates: {
    status?: 'success' | 'failed' | 'partial'
    highlightsImported?: number
    sourcesCreated?: number
    duplicatesSkipped?: number
    errorMessage?: string
    errorDetails?: any
    booksProcessed?: any[]
    durationSeconds?: number
  }
): Promise<void> {
  const fields: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex}`)
    params.push(updates.status)
    paramIndex++
  }

  if (updates.highlightsImported !== undefined) {
    fields.push(`highlights_imported = $${paramIndex}`)
    params.push(updates.highlightsImported)
    paramIndex++
  }

  if (updates.sourcesCreated !== undefined) {
    fields.push(`sources_created = $${paramIndex}`)
    params.push(updates.sourcesCreated)
    paramIndex++
  }

  if (updates.duplicatesSkipped !== undefined) {
    fields.push(`duplicates_skipped = $${paramIndex}`)
    params.push(updates.duplicatesSkipped)
    paramIndex++
  }

  if (updates.errorMessage !== undefined) {
    fields.push(`error_message = $${paramIndex}`)
    params.push(updates.errorMessage)
    paramIndex++
  }

  if (updates.errorDetails !== undefined) {
    fields.push(`error_details = $${paramIndex}`)
    params.push(JSON.stringify(updates.errorDetails))
    paramIndex++
  }

  if (updates.booksProcessed !== undefined) {
    fields.push(`books_processed = $${paramIndex}`)
    params.push(JSON.stringify(updates.booksProcessed))
    paramIndex++
  }

  if (updates.durationSeconds !== undefined) {
    fields.push(`duration_seconds = $${paramIndex}`)
    params.push(updates.durationSeconds)
    paramIndex++
  }

  fields.push('completed_at = NOW()')

  params.push(logId)

  const query = `UPDATE kindle_sync_logs SET ${fields.join(', ')} WHERE id = $${paramIndex}`
  await pool.query(query, params)
}
