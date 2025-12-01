import { NextRequest, NextResponse } from 'next/server'
import {
  parseEmailWebhook,
  isEmailParseError,
  extractTokenFromEmail,
  isValidEmailToken,
} from '@/lib/email/email-parser'
import {
  getUserByEmailToken,
  createEmailImportLog,
  updateEmailImportLog,
} from '@/lib/db/users-store'
import { createSource } from '@/lib/db/highlight-sources-store'
import { parseArticle, isArticleError } from '@/lib/parsers/article-parser'
import { logger } from '@/lib/logger'

/**
 * Email-to-Reader Webhook Endpoint
 *
 * Accepts POST requests from email services (Mailgun, SendGrid, etc.)
 * Processes incoming emails and imports articles from URLs
 *
 * Expected email format:
 * - To: username-TOKEN@reader.yourdomain.com
 * - Body: URLs to import (one per line or mixed with text)
 *
 * Webhook payload format (varies by provider):
 * - Mailgun: https://documentation.mailgun.com/en/latest/api-routes.html#routes
 * - SendGrid: https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 *
 * Example Mailgun payload:
 * {
 *   "from": "user@example.com",
 *   "to": "reader-abc123@yourdomain.com",
 *   "subject": "Article to read",
 *   "body-plain": "Check this out: https://example.com/article",
 *   "body-html": "<p>Check this out: <a href=\"https://example.com/article\">link</a></p>"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let webhookData: any
    try {
      webhookData = await request.json()
    } catch {
      // Try form data if JSON parsing fails (some providers use form encoding)
      const formData = await request.formData()
      webhookData = Object.fromEntries(formData.entries())
    }

    // Parse email content
    const parseResult = parseEmailWebhook(webhookData)

    if (isEmailParseError(parseResult)) {
      logger.error({
        error: parseResult.error,
        details: parseResult.details,
      }, 'Email parse error')
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error,
          details: parseResult.details,
        },
        { status: 400 }
      )
    }

    const { urls, subject, fromAddress, toAddress, hasInlineContent, inlineContent } = parseResult

    // Extract token from recipient address
    const token = extractTokenFromEmail(toAddress)

    if (!token) {
      logger.error({
        toAddress,
      }, 'No token found in recipient address')
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid recipient address',
          details: 'Email address must contain a valid token (e.g., username-TOKEN@domain.com)',
        },
        { status: 400 }
      )
    }

    // Validate token format
    if (!isValidEmailToken(token)) {
      logger.error({
        token,
      }, 'Invalid token format')
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token format',
          details: 'Token must be a valid alphanumeric string',
        },
        { status: 400 }
      )
    }

    // Look up user by token
    const user = await getUserByEmailToken(token)

    if (!user) {
      logger.error({
        token,
      }, 'User not found for token')
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or disabled token',
          details: 'No active user found with this email token',
        },
        { status: 403 }
      )
    }

    logger.info({
      fromAddress,
      username: user.username,
      email: user.email,
    }, 'Email received for user')

    // Check if any content was found
    if (urls.length === 0 && !hasInlineContent) {
      // Create log entry for empty email
      const log = await createEmailImportLog({
        userId: user.id,
        emailToken: token,
        fromAddress,
        subject,
        urlsFound: 0,
        emailBodyPreview: null,
        metadata: { toAddress },
      })

      await updateEmailImportLog(log.id, {
        status: 'failed',
        errorMessage: 'No URLs or article content found in email',
      })

      return NextResponse.json(
        {
          success: false,
          error: 'No content found',
          details: 'Email must contain at least one URL or article content',
        },
        { status: 400 }
      )
    }

    // Create import log
    const log = await createEmailImportLog({
      userId: user.id,
      emailToken: token,
      fromAddress,
      subject,
      urlsFound: urls.length,
      emailBodyPreview: urls.join(', ').substring(0, 500),
      metadata: {
        toAddress,
        hasInlineContent,
        userAgent: request.headers.get('user-agent'),
      },
    })

    // Update log to processing status
    await updateEmailImportLog(log.id, { status: 'processing' })

    const importedSourceIds: number[] = []
    const errors: string[] = []

    // Process URLs
    for (const url of urls) {
      try {
        logger.debug({
          url,
        }, 'Parsing article from URL')

        // Parse the article
        const articleResult = await parseArticle(url)

        if (isArticleError(articleResult)) {
          logger.error({
            url,
            error: articleResult.error,
          }, 'Failed to parse article')
          errors.push(`${url}: ${articleResult.error}`)
          continue
        }

        // Create source with article data
        const source = await createSource({
          sourceType: 'web_article',
          title: articleResult.title,
          author: articleResult.author || undefined,
          url: articleResult.url,
          domain: articleResult.domain,
          content: articleResult.content,
          excerpt: articleResult.excerpt || undefined,
        })

        // Update source with reader-specific fields using raw query
        // (These fields are in the schema but not yet in TypeScript interface)
        const { Pool } = require('pg')
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
          ssl: false,
        })

        await pool.query(
          `UPDATE sources
           SET full_content = $1,
               full_content_html = $2,
               word_count = $3,
               reading_time_minutes = $4,
               updated_at = NOW()
           WHERE id = $5`,
          [
            articleResult.content,
            articleResult.htmlContent,
            articleResult.wordCount,
            articleResult.readingTime,
            source.id,
          ]
        )

        await pool.end()

        importedSourceIds.push(source.id)
        logger.info({
          title: articleResult.title,
          sourceId: source.id,
          url,
        }, 'Article successfully imported')
      } catch (error) {
        logger.error({
          url,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }, 'Error importing URL')
        errors.push(`${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Handle inline content if present and no URLs were successfully imported
    if (hasInlineContent && inlineContent && importedSourceIds.length === 0) {
      try {
        logger.debug({}, 'Importing inline article content')

        // Create source from inline content
        const source = await createSource({
          sourceType: 'web_article',
          title: subject || 'Email Article',
          author: fromAddress,
          content: inlineContent,
          excerpt: inlineContent.substring(0, 200),
        })

        // Update with reader fields
        const { Pool } = require('pg')
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
          ssl: false,
        })

        const wordCount = inlineContent.split(/\s+/).length
        const readingTime = Math.max(1, Math.ceil(wordCount / 200))

        await pool.query(
          `UPDATE sources
           SET full_content = $1,
               word_count = $2,
               reading_time_minutes = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [inlineContent, wordCount, readingTime, source.id]
        )

        await pool.end()

        importedSourceIds.push(source.id)
        logger.info({
          sourceId: source.id,
        }, 'Inline content successfully imported')
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }, 'Error importing inline content')
        errors.push(`Inline content: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Update import log with results
    const finalStatus = importedSourceIds.length > 0 ? 'completed' : 'failed'
    const errorMessage = errors.length > 0 ? errors.join('; ') : null

    await updateEmailImportLog(log.id, {
      status: finalStatus,
      articlesImported: importedSourceIds.length,
      sourceIds: importedSourceIds,
      errorMessage,
    })

    // Send confirmation email (optional - requires email service setup)
    // await sendConfirmationEmail(user.email, importedSourceIds.length, errors)

    // Return success response
    return NextResponse.json(
      {
        success: true,
        imported: importedSourceIds.length,
        total: urls.length + (hasInlineContent ? 1 : 0),
        sourceIds: importedSourceIds,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully imported ${importedSourceIds.length} article(s)`,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Email-to-reader webhook error')

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint - returns webhook information
 */
export async function GET() {
  return NextResponse.json(
    {
      service: 'Email-to-Reader Webhook',
      version: '1.0.0',
      status: 'active',
      documentation: {
        endpoint: '/api/email-to-reader',
        method: 'POST',
        description: 'Forward emails to import articles',
        format: 'username-TOKEN@reader.yourdomain.com',
        supportedProviders: ['Mailgun', 'SendGrid', 'Custom'],
      },
    },
    { status: 200 }
  )
}
