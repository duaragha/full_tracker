import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export interface User {
  id: number
  email: string
  username: string
  fullName: string | null
  emailToken: string | null
  emailEnabled: boolean
  defaultCollectionId: number | null
  defaultTags: string[] | null
  settings: Record<string, any>
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export interface CreateUserDTO {
  email: string
  username: string
  fullName?: string
  emailEnabled?: boolean
  defaultTags?: string[]
  settings?: Record<string, any>
}

export interface EmailImportLog {
  id: number
  userId: number | null
  emailToken: string
  fromAddress: string
  subject: string | null
  receivedAt: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  urlsFound: number
  articlesImported: number
  sourceIds: number[] | null
  errorMessage: string | null
  emailBodyPreview: string | null
  metadata: Record<string, any>
  createdAt: string
  completedAt: string | null
}

function normalizeUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    emailToken: row.email_token,
    emailEnabled: row.email_enabled,
    defaultCollectionId: row.default_collection_id,
    defaultTags: row.default_tags,
    settings: row.settings || {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastLoginAt: row.last_login_at?.toISOString() || null,
  }
}

function normalizeEmailImportLog(row: any): EmailImportLog {
  return {
    id: row.id,
    userId: row.user_id,
    emailToken: row.email_token,
    fromAddress: row.from_address,
    subject: row.subject,
    receivedAt: row.received_at.toISOString(),
    status: row.status,
    urlsFound: row.urls_found,
    articlesImported: row.articles_imported,
    sourceIds: row.source_ids,
    errorMessage: row.error_message,
    emailBodyPreview: row.email_body_preview,
    metadata: row.metadata || {},
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at?.toISOString() || null,
  }
}

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  )

  return result.rows.length > 0 ? normalizeUser(result.rows[0]) : null
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  )

  return result.rows.length > 0 ? normalizeUser(result.rows[0]) : null
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  )

  return result.rows.length > 0 ? normalizeUser(result.rows[0]) : null
}

/**
 * Get user by email token
 */
export async function getUserByEmailToken(token: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE email_token = $1 AND email_enabled = TRUE',
    [token]
  )

  return result.rows.length > 0 ? normalizeUser(result.rows[0]) : null
}

/**
 * Create a new user
 */
export async function createUser(user: CreateUserDTO): Promise<User> {
  const result = await pool.query(
    `INSERT INTO users (
      email, username, full_name, email_enabled, default_tags, settings, email_token
    ) VALUES ($1, $2, $3, $4, $5, $6, generate_email_token())
    RETURNING *`,
    [
      user.email,
      user.username,
      user.fullName || null,
      user.emailEnabled !== undefined ? user.emailEnabled : true,
      user.defaultTags || null,
      user.settings ? JSON.stringify(user.settings) : '{}',
    ]
  )

  return normalizeUser(result.rows[0])
}

/**
 * Update user settings
 */
export async function updateUser(
  id: number,
  updates: Partial<{
    fullName: string
    emailEnabled: boolean
    defaultCollectionId: number
    defaultTags: string[]
    settings: Record<string, any>
  }>
): Promise<void> {
  const fields: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (updates.fullName !== undefined) {
    fields.push(`full_name = $${paramIndex}`)
    params.push(updates.fullName)
    paramIndex++
  }

  if (updates.emailEnabled !== undefined) {
    fields.push(`email_enabled = $${paramIndex}`)
    params.push(updates.emailEnabled)
    paramIndex++
  }

  if (updates.defaultCollectionId !== undefined) {
    fields.push(`default_collection_id = $${paramIndex}`)
    params.push(updates.defaultCollectionId)
    paramIndex++
  }

  if (updates.defaultTags !== undefined) {
    fields.push(`default_tags = $${paramIndex}`)
    params.push(updates.defaultTags)
    paramIndex++
  }

  if (updates.settings !== undefined) {
    fields.push(`settings = $${paramIndex}`)
    params.push(JSON.stringify(updates.settings))
    paramIndex++
  }

  if (fields.length === 0) return

  fields.push('updated_at = NOW()')
  params.push(id)

  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`
  await pool.query(query, params)
}

/**
 * Regenerate email token for a user
 */
export async function regenerateEmailToken(userId: number): Promise<string> {
  const result = await pool.query(
    `UPDATE users
     SET email_token = generate_email_token(), updated_at = NOW()
     WHERE id = $1
     RETURNING email_token`,
    [userId]
  )

  return result.rows[0].email_token
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: number): Promise<void> {
  await pool.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [userId]
  )
}

// ============================================
// EMAIL IMPORT LOGS
// ============================================

/**
 * Create email import log
 */
export async function createEmailImportLog(data: {
  userId?: number | null
  emailToken: string
  fromAddress: string
  subject?: string | null
  urlsFound: number
  emailBodyPreview?: string | null
  metadata?: Record<string, any>
}): Promise<EmailImportLog> {
  const result = await pool.query(
    `INSERT INTO email_import_logs (
      user_id, email_token, from_address, subject,
      urls_found, email_body_preview, metadata, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING *`,
    [
      data.userId || null,
      data.emailToken,
      data.fromAddress,
      data.subject || null,
      data.urlsFound,
      data.emailBodyPreview || null,
      data.metadata ? JSON.stringify(data.metadata) : '{}',
    ]
  )

  return normalizeEmailImportLog(result.rows[0])
}

/**
 * Update email import log status
 */
export async function updateEmailImportLog(
  id: number,
  updates: {
    status?: 'pending' | 'processing' | 'completed' | 'failed'
    articlesImported?: number
    sourceIds?: number[]
    errorMessage?: string | null
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

  if (updates.articlesImported !== undefined) {
    fields.push(`articles_imported = $${paramIndex}`)
    params.push(updates.articlesImported)
    paramIndex++
  }

  if (updates.sourceIds !== undefined) {
    fields.push(`source_ids = $${paramIndex}`)
    params.push(updates.sourceIds)
    paramIndex++
  }

  if (updates.errorMessage !== undefined) {
    fields.push(`error_message = $${paramIndex}`)
    params.push(updates.errorMessage)
    paramIndex++
  }

  if (fields.length === 0) return

  // Add completed_at if status is completed or failed
  if (updates.status === 'completed' || updates.status === 'failed') {
    fields.push('completed_at = NOW()')
  }

  params.push(id)

  const query = `UPDATE email_import_logs SET ${fields.join(', ')} WHERE id = $${paramIndex}`
  await pool.query(query, params)
}

/**
 * Get email import logs for a user
 */
export async function getEmailImportLogs(userId: number, limit = 50): Promise<EmailImportLog[]> {
  const result = await pool.query(
    `SELECT * FROM email_import_logs
     WHERE user_id = $1
     ORDER BY received_at DESC
     LIMIT $2`,
    [userId, limit]
  )

  return result.rows.map(normalizeEmailImportLog)
}

/**
 * Get recent email import logs (for admin/debugging)
 */
export async function getRecentEmailImportLogs(limit = 50): Promise<EmailImportLog[]> {
  const result = await pool.query(
    `SELECT * FROM email_import_logs
     ORDER BY received_at DESC
     LIMIT $1`,
    [limit]
  )

  return result.rows.map(normalizeEmailImportLog)
}

/**
 * Get email import log by ID
 */
export async function getEmailImportLogById(id: number): Promise<EmailImportLog | null> {
  const result = await pool.query(
    'SELECT * FROM email_import_logs WHERE id = $1',
    [id]
  )

  return result.rows.length > 0 ? normalizeEmailImportLog(result.rows[0]) : null
}
