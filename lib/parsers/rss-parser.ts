import Parser from 'rss-parser'

/**
 * Parsed RSS/Atom feed data
 */
export interface ParsedFeed {
  title: string
  description?: string
  feedUrl: string
  siteUrl?: string
  items: ParsedFeedItem[]
}

/**
 * Individual item from RSS feed
 */
export interface ParsedFeedItem {
  title: string
  url: string
  description?: string
  author?: string
  publishedAt?: Date
  content?: string
  guid?: string
}

/**
 * Error result from RSS parsing
 */
export interface RSSParseError {
  error: string
  details?: string
  feedUrl: string
}

/**
 * Validates and normalizes a URL
 * @param url - URL to validate
 * @returns Validated URL or null if invalid
 */
function validateUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    if (!urlObj.protocol.startsWith('http')) {
      return null
    }
    return urlObj.href
  } catch {
    return null
  }
}

/**
 * Extracts the best available URL from an RSS item
 * RSS feeds can have various URL fields
 */
function extractItemUrl(item: any): string | null {
  // Try common URL fields in order of preference
  const urlFields = [
    item.link,
    item.url,
    item.guid,
    item.id,
  ]

  for (const field of urlFields) {
    if (typeof field === 'string') {
      const validUrl = validateUrl(field)
      if (validUrl) return validUrl
    }
    // Some GUIDs are objects with a URL property
    if (field && typeof field === 'object' && field._) {
      const validUrl = validateUrl(field._)
      if (validUrl) return validUrl
    }
  }

  return null
}

/**
 * Parses a date from various formats found in RSS feeds
 */
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined

  try {
    const date = new Date(dateStr)
    // Check if valid date
    if (!isNaN(date.getTime())) {
      return date
    }
  } catch {
    // Invalid date
  }

  return undefined
}

/**
 * Strips HTML tags from text content
 */
function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined

  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || undefined
}

/**
 * Parses an RSS or Atom feed from a URL
 * @param feedUrl - The URL of the RSS/Atom feed
 * @param timeoutMs - Timeout in milliseconds (default: 15000)
 * @returns Parsed feed data or error information
 */
export async function parseRSSFeed(
  feedUrl: string,
  timeoutMs: number = 15000
): Promise<ParsedFeed | RSSParseError> {
  try {
    // Validate feed URL
    const validatedUrl = validateUrl(feedUrl)
    if (!validatedUrl) {
      return {
        error: 'Invalid feed URL',
        details: 'Please provide a valid URL starting with http:// or https://',
        feedUrl,
      }
    }

    // Create parser with custom options
    const parser = new Parser({
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader Bot/1.0)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      customFields: {
        feed: ['language', 'subtitle'],
        item: [
          ['content:encoded', 'contentEncoded'],
          ['dc:creator', 'creator'],
        ],
      },
    })

    // Parse the feed
    let feed: any
    try {
      feed = await parser.parseURL(validatedUrl)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return {
            error: 'Feed fetch timeout',
            details: `The feed took too long to respond (exceeded ${timeoutMs}ms)`,
            feedUrl: validatedUrl,
          }
        }

        if (error.message.includes('404') || error.message.includes('Not Found')) {
          return {
            error: 'Feed not found',
            details: 'The feed URL returned a 404 error. Check the URL is correct.',
            feedUrl: validatedUrl,
          }
        }

        if (error.message.includes('403') || error.message.includes('401')) {
          return {
            error: 'Access denied',
            details: 'The feed requires authentication or is blocking automated access.',
            feedUrl: validatedUrl,
          }
        }

        return {
          error: 'Failed to fetch feed',
          details: error.message,
          feedUrl: validatedUrl,
        }
      }

      return {
        error: 'Unknown fetch error',
        details: 'An unexpected error occurred while fetching the feed.',
        feedUrl: validatedUrl,
      }
    }

    // Validate feed has required fields
    if (!feed.title) {
      return {
        error: 'Invalid feed format',
        details: 'The feed is missing a title. It may not be a valid RSS/Atom feed.',
        feedUrl: validatedUrl,
      }
    }

    if (!feed.items || !Array.isArray(feed.items)) {
      return {
        error: 'Invalid feed format',
        details: 'The feed does not contain any items.',
        feedUrl: validatedUrl,
      }
    }

    // Parse feed items
    const parsedItems: ParsedFeedItem[] = []

    for (const item of feed.items) {
      // Extract URL
      const itemUrl = extractItemUrl(item)
      if (!itemUrl) {
        // Skip items without valid URLs
        continue
      }

      // Extract title
      const title = item.title?.trim()
      if (!title) {
        // Skip items without titles
        continue
      }

      // Extract description (try multiple fields)
      const description = stripHtml(
        item.contentSnippet ||
        item.description ||
        item.summary ||
        item.content
      )

      // Extract content (prefer encoded content)
      const content = item.contentEncoded || item.content

      // Extract author (try multiple fields)
      const author = (
        item.creator ||
        item.author ||
        item['dc:creator']
      )?.trim() || undefined

      // Parse published date
      const publishedAt = parseDate(item.pubDate || item.isoDate || item.published)

      parsedItems.push({
        title,
        url: itemUrl,
        description,
        author,
        publishedAt,
        content: stripHtml(content),
        guid: item.guid || item.id || itemUrl,
      })
    }

    // Return parsed feed
    return {
      title: feed.title.trim(),
      description: stripHtml(feed.description || feed.subtitle),
      feedUrl: validatedUrl,
      siteUrl: validateUrl(feed.link || '') || undefined,
      items: parsedItems,
    }

  } catch (error) {
    // Handle unexpected errors
    if (error instanceof Error) {
      return {
        error: 'Feed parsing failed',
        details: error.message,
        feedUrl,
      }
    }

    return {
      error: 'Unknown error',
      details: 'An unexpected error occurred while parsing the feed.',
      feedUrl,
    }
  }
}

/**
 * Type guard to check if parse result is an error
 */
export function isRSSError(result: ParsedFeed | RSSParseError): result is RSSParseError {
  return 'error' in result
}

/**
 * Parse RSS feed and throw on error (convenience function)
 */
export async function parseRSSFeedOrThrow(feedUrl: string): Promise<ParsedFeed> {
  const result = await parseRSSFeed(feedUrl)

  if (isRSSError(result)) {
    throw new Error(`${result.error}: ${result.details || 'No additional details'}`)
  }

  return result
}
