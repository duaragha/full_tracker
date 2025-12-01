import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/lib/db/users-store'
import { parseArticle, isArticleError } from '@/lib/parsers/article-parser'
import { createSource } from '@/lib/db/highlight-sources-store'
import { createEmailImportLog, updateEmailImportLog } from '@/lib/db/users-store'
import { logger } from '@/lib/logger'

// For now, we'll use a hardcoded user ID
// In production, this should come from session/auth
const DEFAULT_USER_ID = 1

/**
 * POST - Test email-to-reader functionality with a URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testUrl } = body

    if (!testUrl || typeof testUrl !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request body', message: 'testUrl is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(testUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL', message: 'Please provide a valid URL starting with http:// or https://' },
        { status: 400 }
      )
    }

    // Get user data
    const user = await getUserById(DEFAULT_USER_ID)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'User account not found' },
        { status: 404 }
      )
    }

    if (!user.emailEnabled) {
      return NextResponse.json(
        { error: 'Email-to-reader disabled', message: 'Email-to-reader is currently disabled' },
        { status: 403 }
      )
    }

    // Create import log for the test
    const log = await createEmailImportLog({
      userId: user.id,
      emailToken: user.emailToken || '',
      fromAddress: user.email,
      subject: 'Test Import',
      urlsFound: 1,
      emailBodyPreview: testUrl,
      metadata: { isTest: true },
    })

    // Update log to processing
    await updateEmailImportLog(log.id, { status: 'processing' })

    try {
      // Parse the article
      logger.debug({
        testUrl,
      }, 'Test: Parsing article from URL')
      const articleResult = await parseArticle(testUrl)

      if (isArticleError(articleResult)) {
        // Update log with error
        await updateEmailImportLog(log.id, {
          status: 'failed',
          errorMessage: `${articleResult.error}: ${articleResult.details || ''}`,
        })

        logger.error({
          error: articleResult.error,
          details: articleResult.details,
          testUrl,
        }, 'Test: Article parse error')

        return NextResponse.json(
          {
            error: articleResult.error,
            message: articleResult.details || articleResult.error,
          },
          { status: 400 }
        )
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

      // Update log with success
      await updateEmailImportLog(log.id, {
        status: 'completed',
        articlesImported: 1,
        sourceIds: [source.id],
      })

      logger.info({
        sourceId: source.id,
        title: articleResult.title,
      }, 'Test: Article successfully imported')

      return NextResponse.json({
        success: true,
        message: `Successfully imported: ${articleResult.title}`,
        sourceId: source.id,
        article: {
          title: articleResult.title,
          author: articleResult.author,
          wordCount: articleResult.wordCount,
          readingTime: articleResult.readingTime,
        },
      })
    } catch (error) {
      // Update log with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await updateEmailImportLog(log.id, {
        status: 'failed',
        errorMessage,
      })

      logger.error({
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Test: Error importing article')

      return NextResponse.json(
        {
          error: 'Import failed',
          message: errorMessage,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Error in test endpoint')
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
