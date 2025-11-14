/**
 * API Authentication and Rate Limiting Middleware
 *
 * Provides Bearer token authentication for public REST API endpoints.
 * Includes rate limiting based on hourly and daily quotas.
 *
 * @module lib/api/auth
 */

import { Pool } from 'pg'
import { NextRequest, NextResponse } from 'next/server'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// ============================================
// Types
// ============================================

export interface ApiKey {
  id: number
  name: string
  key: string
  scopes: string[]
  rateLimitPerHour: number
  rateLimitPerDay: number
  isActive: boolean
  expiresAt?: string | null
  lastUsedAt?: string | null
  requestCount: bigint
  createdAt: string
  updatedAt: string
}

export interface ApiKeyValidation {
  id: number
  name: string
  scopes: string[]
  rateLimitPerHour: number
  rateLimitPerDay: number
  isValid: boolean
}

export interface RateLimitCheck {
  isAllowed: boolean
  requestsLastHour: number
  requestsLastDay: number
  resetHourAt: string
  resetDayAt: string
}

export interface ApiRequestLog {
  id: bigint
  apiKeyId: number
  method: string
  endpoint: string
  statusCode: number
  ipAddress?: string
  userAgent?: string
  responseTimeMs?: number
  createdAt: string
}

export interface AuthenticatedRequest {
  apiKey: ApiKeyValidation
  rateLimitInfo: RateLimitCheck
}

// ============================================
// Error Responses
// ============================================

export function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    },
    { status: 401 }
  )
}

export function rateLimitResponse(rateLimitInfo: RateLimitCheck) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        details: {
          requestsLastHour: rateLimitInfo.requestsLastHour,
          requestsLastDay: rateLimitInfo.requestsLastDay,
          resetHourAt: rateLimitInfo.resetHourAt,
          resetDayAt: rateLimitInfo.resetDayAt,
        },
      },
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit-Hour': rateLimitInfo.isAllowed ? '100' : '0',
        'X-RateLimit-Remaining-Hour': String(Math.max(0, 100 - rateLimitInfo.requestsLastHour)),
        'X-RateLimit-Reset-Hour': rateLimitInfo.resetHourAt,
        'Retry-After': '3600', // 1 hour in seconds
      },
    }
  )
}

export function forbiddenResponse(message: string = 'Forbidden') {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
      },
    },
    { status: 403 }
  )
}

// ============================================
// API Key Management
// ============================================

/**
 * Generate a new API key
 */
export async function generateApiKey(
  name: string,
  description?: string,
  scopes: string[] = ['read', 'write'],
  rateLimitPerHour: number = 100,
  rateLimitPerDay: number = 1000,
  expiresAt?: string
): Promise<ApiKey> {
  const result = await pool.query(
    `INSERT INTO api_keys (
      key,
      name,
      description,
      scopes,
      rate_limit_per_hour,
      rate_limit_per_day,
      expires_at,
      created_at,
      updated_at
    ) VALUES (
      generate_api_key(),
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      NOW(),
      NOW()
    )
    RETURNING *`,
    [
      name,
      description || null,
      JSON.stringify(scopes),
      rateLimitPerHour,
      rateLimitPerDay,
      expiresAt || null,
    ]
  )

  return normalizeApiKey(result.rows[0])
}

/**
 * List all API keys
 */
export async function listApiKeys(includeInactive: boolean = false): Promise<ApiKey[]> {
  const query = includeInactive
    ? 'SELECT * FROM api_keys ORDER BY created_at DESC'
    : 'SELECT * FROM api_keys WHERE is_active = TRUE ORDER BY created_at DESC'

  const result = await pool.query(query)
  return result.rows.map(normalizeApiKey)
}

/**
 * Get API key by ID
 */
export async function getApiKeyById(id: number): Promise<ApiKey | null> {
  const result = await pool.query('SELECT * FROM api_keys WHERE id = $1', [id])
  return result.rows.length > 0 ? normalizeApiKey(result.rows[0]) : null
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(id: number): Promise<void> {
  await pool.query(
    'UPDATE api_keys SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
    [id]
  )
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(id: number): Promise<void> {
  await pool.query('DELETE FROM api_keys WHERE id = $1', [id])
}

/**
 * Update API key details
 */
export async function updateApiKey(
  id: number,
  updates: {
    name?: string
    description?: string
    scopes?: string[]
    rateLimitPerHour?: number
    rateLimitPerDay?: number
    expiresAt?: string | null
  }
): Promise<void> {
  const fields: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex}`)
    params.push(updates.name)
    paramIndex++
  }

  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex}`)
    params.push(updates.description)
    paramIndex++
  }

  if (updates.scopes !== undefined) {
    fields.push(`scopes = $${paramIndex}`)
    params.push(JSON.stringify(updates.scopes))
    paramIndex++
  }

  if (updates.rateLimitPerHour !== undefined) {
    fields.push(`rate_limit_per_hour = $${paramIndex}`)
    params.push(updates.rateLimitPerHour)
    paramIndex++
  }

  if (updates.rateLimitPerDay !== undefined) {
    fields.push(`rate_limit_per_day = $${paramIndex}`)
    params.push(updates.rateLimitPerDay)
    paramIndex++
  }

  if (updates.expiresAt !== undefined) {
    fields.push(`expires_at = $${paramIndex}`)
    params.push(updates.expiresAt)
    paramIndex++
  }

  if (fields.length > 0) {
    fields.push('updated_at = NOW()')
    params.push(id)
    await pool.query(`UPDATE api_keys SET ${fields.join(', ')} WHERE id = $${paramIndex}`, params)
  }
}

// ============================================
// Authentication & Rate Limiting
// ============================================

/**
 * Validate API key and check rate limits
 */
export async function validateApiKey(key: string): Promise<ApiKeyValidation | null> {
  const result = await pool.query('SELECT * FROM validate_api_key($1)', [key])

  if (result.rows.length === 0 || !result.rows[0].is_valid) {
    return null
  }

  return {
    id: result.rows[0].id,
    name: result.rows[0].name,
    scopes: result.rows[0].scopes,
    rateLimitPerHour: result.rows[0].rate_limit_per_hour,
    rateLimitPerDay: result.rows[0].rate_limit_per_day,
    isValid: result.rows[0].is_valid,
  }
}

/**
 * Check rate limit for API key
 */
export async function checkRateLimit(
  apiKeyId: number,
  rateLimitPerHour: number,
  rateLimitPerDay: number
): Promise<RateLimitCheck> {
  const result = await pool.query('SELECT * FROM check_rate_limit($1, $2, $3)', [
    apiKeyId,
    rateLimitPerHour,
    rateLimitPerDay,
  ])

  return {
    isAllowed: result.rows[0].is_allowed,
    requestsLastHour: parseInt(result.rows[0].requests_last_hour),
    requestsLastDay: parseInt(result.rows[0].requests_last_day),
    resetHourAt: result.rows[0].reset_hour_at.toISOString(),
    resetDayAt: result.rows[0].reset_day_at.toISOString(),
  }
}

/**
 * Log API request
 */
export async function logApiRequest(
  apiKeyId: number,
  method: string,
  endpoint: string,
  statusCode: number,
  ipAddress?: string,
  userAgent?: string,
  responseTimeMs?: number,
  errorMessage?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO api_request_log (
      api_key_id,
      method,
      endpoint,
      status_code,
      ip_address,
      user_agent,
      response_time_ms,
      error_message,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      apiKeyId,
      method,
      endpoint,
      statusCode,
      ipAddress || null,
      userAgent || null,
      responseTimeMs || null,
      errorMessage || null,
    ]
  )

  // Update last_used_at and request_count
  await pool.query(
    'UPDATE api_keys SET last_used_at = NOW(), request_count = request_count + 1 WHERE id = $1',
    [apiKeyId]
  )
}

/**
 * Authenticate API request
 *
 * Validates Bearer token and checks rate limits.
 * Returns null if authentication fails.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedRequest | null> {
  // Extract Bearer token
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  // Validate API key
  const apiKey = await validateApiKey(token)
  if (!apiKey) {
    return null
  }

  // Check rate limits
  const rateLimitInfo = await checkRateLimit(
    apiKey.id,
    apiKey.rateLimitPerHour,
    apiKey.rateLimitPerDay
  )

  return {
    apiKey,
    rateLimitInfo,
  }
}

/**
 * Middleware wrapper for authenticated API routes
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withAuth(request, async (auth) => {
 *     // Your authenticated handler here
 *     return NextResponse.json({ data: ... })
 *   })
 * }
 * ```
 */
export async function withAuth(
  request: NextRequest,
  handler: (auth: AuthenticatedRequest) => Promise<NextResponse>,
  requiredScopes?: string[]
): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Authenticate request
    const auth = await authenticateRequest(request)

    if (!auth) {
      return unauthorizedResponse('Invalid or missing API key')
    }

    // Check rate limit
    if (!auth.rateLimitInfo.isAllowed) {
      await logApiRequest(
        auth.apiKey.id,
        request.method,
        request.nextUrl.pathname,
        429,
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined,
        Date.now() - startTime
      )
      return rateLimitResponse(auth.rateLimitInfo)
    }

    // Check scopes if required
    if (requiredScopes && requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every((scope) =>
        auth.apiKey.scopes.includes(scope) || auth.apiKey.scopes.includes('admin')
      )
      if (!hasAllScopes) {
        await logApiRequest(
          auth.apiKey.id,
          request.method,
          request.nextUrl.pathname,
          403,
          request.headers.get('x-forwarded-for') || undefined,
          request.headers.get('user-agent') || undefined,
          Date.now() - startTime
        )
        return forbiddenResponse('Insufficient permissions')
      }
    }

    // Execute handler
    const response = await handler(auth)

    // Log successful request
    await logApiRequest(
      auth.apiKey.id,
      request.method,
      request.nextUrl.pathname,
      response.status,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      Date.now() - startTime
    )

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit-Hour', String(auth.apiKey.rateLimitPerHour))
    response.headers.set(
      'X-RateLimit-Remaining-Hour',
      String(Math.max(0, auth.apiKey.rateLimitPerHour - auth.rateLimitInfo.requestsLastHour))
    )
    response.headers.set('X-RateLimit-Reset-Hour', auth.rateLimitInfo.resetHourAt)

    return response
  } catch (error) {
    console.error('API authentication error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}

// ============================================
// Utility Functions
// ============================================

function normalizeApiKey(row: any): ApiKey {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    scopes: row.scopes || [],
    rateLimitPerHour: row.rate_limit_per_hour,
    rateLimitPerDay: row.rate_limit_per_day,
    isActive: row.is_active,
    expiresAt: row.expires_at?.toISOString() || null,
    lastUsedAt: row.last_used_at?.toISOString() || null,
    requestCount: row.request_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * Check if API key has specific scope
 */
export function hasScope(apiKey: ApiKeyValidation, scope: string): boolean {
  return apiKey.scopes.includes(scope) || apiKey.scopes.includes('admin')
}
