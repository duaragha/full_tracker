import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export interface ParsedArticle {
  title: string
  author: string | null
  content: string
  htmlContent: string
  excerpt: string | null
  url: string
  wordCount: number
  readingTime: number
  domain: string
}

export interface ArticleParseError {
  error: string
  details?: string
  url: string
}

/**
 * Fetches HTML content from a URL with timeout handling
 * @param url - The URL to fetch
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns HTML content as string
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`

      // Provide helpful error messages based on status code
      if (response.status === 401 || response.status === 403) {
        errorMessage += '\n\nThis website is blocking automated access. Try these alternatives:\n' +
          '- Copy and paste the article content manually\n' +
          '- Try a different article from a less restrictive site\n' +
          '- Some sites work better: Medium, Substack, personal blogs'
      } else if (response.status === 404) {
        errorMessage += '\n\nThe article was not found. Check the URL is correct.'
      } else if (response.status >= 500) {
        errorMessage += '\n\nThe website is experiencing server issues. Try again later.'
      }

      throw new Error(errorMessage)
    }

    const html = await response.text()
    return html
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Extracts domain from URL
 * @param url - The URL to extract domain from
 * @returns Domain name without www prefix
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Calculates word count from text content
 * @param text - Text content to count words in
 * @returns Number of words
 */
function calculateWordCount(text: string): number {
  const cleanText = text.trim()
  if (!cleanText) return 0

  return cleanText
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length
}

/**
 * Calculates reading time in minutes based on word count
 * @param wordCount - Number of words in the content
 * @param wordsPerMinute - Reading speed (default: 200)
 * @returns Reading time in minutes (minimum 1)
 */
function calculateReadingTime(wordCount: number, wordsPerMinute: number = 200): number {
  if (wordCount === 0) return 1
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}

/**
 * Strips HTML tags from content
 * @param html - HTML content
 * @returns Plain text content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parses a web article from a URL using @mozilla/readability
 * @param url - The URL of the article to parse
 * @returns Parsed article data or error information
 */
export async function parseArticle(url: string): Promise<ParsedArticle | ArticleParseError> {
  try {
    // Validate URL
    let urlObj: URL
    try {
      urlObj = new URL(url)
    } catch {
      return {
        error: 'Invalid URL',
        details: 'Please provide a valid URL starting with http:// or https://',
        url
      }
    }

    // Extract domain early
    const domain = extractDomain(url)

    // Fetch HTML content with timeout
    let html: string
    try {
      html = await fetchWithTimeout(url, 10000)
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: 'Request timeout',
            details: 'The request took too long (exceeded 10 seconds). The site may be slow or unresponsive.',
            url
          }
        }

        if (error.message.includes('fetch') || error.message.includes('network')) {
          return {
            error: 'Network error',
            details: 'Unable to fetch the URL. The site may be down or blocking requests.',
            url
          }
        }

        if (error.message.includes('HTTP')) {
          return {
            error: 'HTTP error',
            details: error.message,
            url
          }
        }

        return {
          error: 'Fetch failed',
          details: error.message,
          url
        }
      }

      return {
        error: 'Fetch failed',
        details: 'An unknown error occurred while fetching the URL.',
        url
      }
    }

    // Validate HTML content
    if (!html || html.trim().length === 0) {
      return {
        error: 'Empty response',
        details: 'The URL returned empty content.',
        url
      }
    }

    // Parse HTML with JSDOM
    let dom: JSDOM
    try {
      dom = new JSDOM(html, {
        url: url,
        contentType: 'text/html'
      })
    } catch (error) {
      return {
        error: 'HTML parsing failed',
        details: error instanceof Error ? error.message : 'Unable to parse HTML content.',
        url
      }
    }

    // Extract article using Readability
    const reader = new Readability(dom.window.document, {
      keepClasses: false,
      disableJSONLD: false
    })

    const article = reader.parse()

    if (!article) {
      return {
        error: 'Unable to extract article content',
        details: 'The page may be behind a paywall, require JavaScript, or not contain an article.',
        url
      }
    }

    // Validate required fields
    if (!article.title) {
      return {
        error: 'Missing article title',
        details: 'Could not extract title from the page.',
        url
      }
    }

    if (!article.content || article.content.trim().length === 0) {
      return {
        error: 'Missing article content',
        details: 'Could not extract content from the page.',
        url
      }
    }

    // Extract plain text content
    const textContent = stripHtml(article.textContent || article.content)

    // Calculate metrics
    const wordCount = calculateWordCount(textContent)
    const readingTime = calculateReadingTime(wordCount)

    // Generate excerpt
    const excerpt = article.excerpt || (textContent.length > 200
      ? textContent.substring(0, 200).trim() + '...'
      : textContent.trim()) || null

    // Return parsed article
    return {
      title: article.title.trim(),
      author: article.byline?.trim() || null,
      content: textContent,
      htmlContent: article.content,
      excerpt,
      url,
      wordCount,
      readingTime,
      domain
    }

  } catch (error) {
    // Handle unexpected errors
    if (error instanceof Error) {
      return {
        error: 'Parsing failed',
        details: error.message,
        url
      }
    }

    return {
      error: 'Unknown error',
      details: 'An unexpected error occurred while parsing the article.',
      url
    }
  }
}

/**
 * Type guard to check if a parsed result is an error
 * @param result - The parse result to check
 * @returns True if the result is an error
 */
export function isArticleError(result: ParsedArticle | ArticleParseError): result is ArticleParseError {
  return 'error' in result
}

/**
 * Convenience function to parse article and throw on error
 * @param url - The URL of the article to parse
 * @returns Parsed article data
 * @throws Error if parsing fails
 */
export async function parseArticleOrThrow(url: string): Promise<ParsedArticle> {
  const result = await parseArticle(url)

  if (isArticleError(result)) {
    throw new Error(`${result.error}: ${result.details || 'No additional details'}`)
  }

  return result
}
