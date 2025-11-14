#!/usr/bin/env tsx

/**
 * API Key Management CLI
 *
 * Usage:
 *   npm run api-keys list                    # List all API keys
 *   npm run api-keys create "My App"         # Create new API key
 *   npm run api-keys revoke <id>             # Revoke an API key
 *   npm run api-keys delete <id>             # Delete an API key
 *   npm run api-keys update <id> --name "New Name" --rate-limit 200
 *   npm run api-keys stats <id>              # Show usage statistics
 */

import { Pool } from 'pg'
import * as readline from 'readline'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

async function listApiKeys() {
  const result = await pool.query(`
    SELECT
      id,
      name,
      key,
      is_active,
      scopes,
      rate_limit_per_hour,
      rate_limit_per_day,
      request_count,
      last_used_at,
      expires_at,
      created_at
    FROM api_keys
    ORDER BY created_at DESC
  `)

  if (result.rows.length === 0) {
    console.log(colorize('\nNo API keys found.', 'dim'))
    console.log(colorize('Create one with: npm run api-keys create "My App"\n', 'dim'))
    return
  }

  console.log(colorize('\n=== API Keys ===\n', 'bright'))

  for (const row of result.rows) {
    const status = row.is_active ? colorize('ACTIVE', 'green') : colorize('REVOKED', 'red')
    const expired =
      row.expires_at && new Date(row.expires_at) < new Date()
        ? colorize(' (EXPIRED)', 'red')
        : ''

    console.log(colorize(`ID: ${row.id}`, 'bright'))
    console.log(`Name: ${row.name}`)
    console.log(`Status: ${status}${expired}`)
    console.log(`Key: ${colorize(row.key, 'cyan')}`)
    console.log(`Scopes: ${row.scopes.join(', ')}`)
    console.log(
      `Rate Limits: ${row.rate_limit_per_hour}/hour, ${row.rate_limit_per_day}/day`
    )
    console.log(`Total Requests: ${row.request_count}`)
    console.log(
      `Last Used: ${
        row.last_used_at ? new Date(row.last_used_at).toLocaleString() : 'Never'
      }`
    )
    console.log(`Created: ${new Date(row.created_at).toLocaleString()}`)
    if (row.expires_at) {
      console.log(`Expires: ${new Date(row.expires_at).toLocaleString()}`)
    }
    console.log('')
  }
}

async function createApiKey(name: string, options: {
  description?: string
  scopes?: string[]
  rateLimitPerHour?: number
  rateLimitPerDay?: number
  expiresAt?: string
}) {
  const scopes = options.scopes || ['read', 'write']
  const rateLimitPerHour = options.rateLimitPerHour || 100
  const rateLimitPerDay = options.rateLimitPerDay || 1000

  const result = await pool.query(
    `INSERT INTO api_keys (
      key,
      name,
      description,
      scopes,
      rate_limit_per_hour,
      rate_limit_per_day,
      expires_at
    ) VALUES (
      generate_api_key(),
      $1,
      $2,
      $3,
      $4,
      $5,
      $6
    )
    RETURNING *`,
    [
      name,
      options.description || null,
      JSON.stringify(scopes),
      rateLimitPerHour,
      rateLimitPerDay,
      options.expiresAt || null,
    ]
  )

  const apiKey = result.rows[0]

  console.log(colorize('\n✓ API Key Created Successfully!\n', 'green'))
  console.log(colorize(`ID: ${apiKey.id}`, 'bright'))
  console.log(`Name: ${apiKey.name}`)
  console.log(`Key: ${colorize(apiKey.key, 'cyan')}`)
  console.log(`Scopes: ${scopes.join(', ')}`)
  console.log(`Rate Limits: ${rateLimitPerHour}/hour, ${rateLimitPerDay}/day`)
  console.log('')
  console.log(
    colorize(
      '⚠️  Save this key securely - it will not be shown again!',
      'yellow'
    )
  )
  console.log('')
  console.log(colorize('Usage:', 'bright'))
  console.log(
    `  curl -H "Authorization: Bearer ${apiKey.key}" https://api.example.com/api/v1/highlights`
  )
  console.log('')
}

async function revokeApiKey(id: number) {
  const result = await pool.query(
    'UPDATE api_keys SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING name',
    [id]
  )

  if (result.rows.length === 0) {
    console.log(colorize(`\n✗ API key with ID ${id} not found.\n`, 'red'))
    return
  }

  console.log(
    colorize(
      `\n✓ API key "${result.rows[0].name}" (ID: ${id}) has been revoked.\n`,
      'green'
    )
  )
}

async function deleteApiKey(id: number) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise<void>((resolve) => {
    rl.question(
      colorize(
        `Are you sure you want to permanently delete API key ${id}? (y/N) `,
        'yellow'
      ),
      async (answer) => {
        rl.close()

        if (answer.toLowerCase() !== 'y') {
          console.log(colorize('\nCancelled.\n', 'dim'))
          resolve()
          return
        }

        const result = await pool.query(
          'DELETE FROM api_keys WHERE id = $1 RETURNING name',
          [id]
        )

        if (result.rows.length === 0) {
          console.log(colorize(`\n✗ API key with ID ${id} not found.\n`, 'red'))
        } else {
          console.log(
            colorize(
              `\n✓ API key "${result.rows[0].name}" (ID: ${id}) has been permanently deleted.\n`,
              'green'
            )
          )
        }

        resolve()
      }
    )
  })
}

async function updateApiKey(
  id: number,
  updates: {
    name?: string
    description?: string
    scopes?: string[]
    rateLimitPerHour?: number
    rateLimitPerDay?: number
    expiresAt?: string | null
  }
) {
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

  if (fields.length === 0) {
    console.log(colorize('\n✗ No updates provided.\n', 'red'))
    return
  }

  fields.push('updated_at = NOW()')
  params.push(id)

  const result = await pool.query(
    `UPDATE api_keys SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING name`,
    params
  )

  if (result.rows.length === 0) {
    console.log(colorize(`\n✗ API key with ID ${id} not found.\n`, 'red'))
    return
  }

  console.log(
    colorize(
      `\n✓ API key "${result.rows[0].name}" (ID: ${id}) has been updated.\n`,
      'green'
    )
  )
}

async function showStats(id: number) {
  const keyResult = await pool.query(
    'SELECT * FROM api_keys WHERE id = $1',
    [id]
  )

  if (keyResult.rows.length === 0) {
    console.log(colorize(`\n✗ API key with ID ${id} not found.\n`, 'red'))
    return
  }

  const apiKey = keyResult.rows[0]

  // Get request statistics
  const statsResult = await pool.query(
    `SELECT
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as requests_last_hour,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as requests_last_day,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as requests_last_week,
      AVG(response_time_ms) as avg_response_time,
      COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
      COUNT(*) FILTER (WHERE status_code = 429) as rate_limit_hits
    FROM api_request_log
    WHERE api_key_id = $1`,
    [id]
  )

  const stats = statsResult.rows[0]

  // Get top endpoints
  const endpointsResult = await pool.query(
    `SELECT
      endpoint,
      COUNT(*) as request_count,
      AVG(response_time_ms) as avg_response_time
    FROM api_request_log
    WHERE api_key_id = $1
    GROUP BY endpoint
    ORDER BY request_count DESC
    LIMIT 5`,
    [id]
  )

  console.log(colorize(`\n=== API Key Statistics: ${apiKey.name} ===\n`, 'bright'))

  console.log(colorize('Usage:', 'bright'))
  console.log(`Total Requests: ${stats.total_requests}`)
  console.log(`Last Hour: ${stats.requests_last_hour}`)
  console.log(`Last 24 Hours: ${stats.requests_last_day}`)
  console.log(`Last 7 Days: ${stats.requests_last_week}`)
  console.log('')

  console.log(colorize('Performance:', 'bright'))
  console.log(
    `Average Response Time: ${
      stats.avg_response_time ? Math.round(stats.avg_response_time) + 'ms' : 'N/A'
    }`
  )
  console.log(`Error Count: ${stats.error_count}`)
  console.log(`Rate Limit Hits: ${stats.rate_limit_hits}`)
  console.log('')

  if (endpointsResult.rows.length > 0) {
    console.log(colorize('Top Endpoints:', 'bright'))
    for (const row of endpointsResult.rows) {
      console.log(
        `  ${row.endpoint}: ${row.request_count} requests (${Math.round(
          row.avg_response_time
        )}ms avg)`
      )
    }
    console.log('')
  }

  // Rate limit status
  const rateLimitResult = await pool.query(
    'SELECT * FROM check_rate_limit($1, $2, $3)',
    [id, apiKey.rate_limit_per_hour, apiKey.rate_limit_per_day]
  )

  const rateLimit = rateLimitResult.rows[0]

  console.log(colorize('Rate Limit Status:', 'bright'))
  console.log(
    `Hourly: ${rateLimit.requests_last_hour}/${apiKey.rate_limit_per_hour} ` +
      `(${Math.round((rateLimit.requests_last_hour / apiKey.rate_limit_per_hour) * 100)}%)`
  )
  console.log(
    `Daily: ${rateLimit.requests_last_day}/${apiKey.rate_limit_per_day} ` +
      `(${Math.round((rateLimit.requests_last_day / apiKey.rate_limit_per_day) * 100)}%)`
  )
  console.log('')
}

// Main CLI handler
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  try {
    switch (command) {
      case 'list':
      case 'ls':
        await listApiKeys()
        break

      case 'create':
        if (args.length < 2) {
          console.log(colorize('\nUsage: npm run api-keys create "Name"\n', 'red'))
          process.exit(1)
        }
        await createApiKey(args[1], {})
        break

      case 'revoke':
        if (args.length < 2) {
          console.log(colorize('\nUsage: npm run api-keys revoke <id>\n', 'red'))
          process.exit(1)
        }
        await revokeApiKey(parseInt(args[1]))
        break

      case 'delete':
      case 'rm':
        if (args.length < 2) {
          console.log(colorize('\nUsage: npm run api-keys delete <id>\n', 'red'))
          process.exit(1)
        }
        await deleteApiKey(parseInt(args[1]))
        break

      case 'stats':
        if (args.length < 2) {
          console.log(colorize('\nUsage: npm run api-keys stats <id>\n', 'red'))
          process.exit(1)
        }
        await showStats(parseInt(args[1]))
        break

      case 'help':
      default:
        console.log(colorize('\n=== API Key Management ===\n', 'bright'))
        console.log('Commands:')
        console.log('  list                    List all API keys')
        console.log('  create "Name"           Create new API key')
        console.log('  revoke <id>             Revoke an API key')
        console.log('  delete <id>             Delete an API key')
        console.log('  stats <id>              Show usage statistics')
        console.log('  help                    Show this help')
        console.log('')
        break
    }
  } catch (error) {
    console.error(colorize('\n✗ Error:', 'red'), error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
