/**
 * Type definitions for article-parser module
 */

/**
 * Successfully parsed article data
 */
export interface ParsedArticle {
  /** Article title */
  title: string
  /** Article author (if available) */
  author: string | null
  /** Plain text content (HTML tags stripped) */
  content: string
  /** HTML content (cleaned) */
  htmlContent: string
  /** Short excerpt for previews */
  excerpt: string | null
  /** Original URL */
  url: string
  /** Total word count */
  wordCount: number
  /** Estimated reading time in minutes (based on 200 words per minute) */
  readingTime: number
  /** Domain name (without www prefix) */
  domain: string
}

/**
 * Article parsing error information
 */
export interface ArticleParseError {
  /** Error type */
  error: string
  /** Additional error details */
  details?: string
  /** URL that failed to parse */
  url: string
}

/**
 * Parses a web article from a URL using @mozilla/readability
 *
 * @param url - The URL of the article to parse
 * @returns Parsed article data or error information
 *
 * @example
 * ```typescript
 * const result = await parseArticle('https://example.com/article')
 *
 * if (isArticleError(result)) {
 *   console.error(result.error)
 * } else {
 *   console.log(result.title)
 *   console.log(result.wordCount)
 * }
 * ```
 */
export function parseArticle(url: string): Promise<ParsedArticle | ArticleParseError>

/**
 * Type guard to check if a parsed result is an error
 *
 * @param result - The parse result to check
 * @returns True if the result is an error
 *
 * @example
 * ```typescript
 * const result = await parseArticle(url)
 * if (isArticleError(result)) {
 *   // result is ArticleParseError
 *   console.error(result.error)
 * } else {
 *   // result is ParsedArticle
 *   console.log(result.title)
 * }
 * ```
 */
export function isArticleError(result: ParsedArticle | ArticleParseError): result is ArticleParseError

/**
 * Convenience function to parse article and throw on error
 *
 * @param url - The URL of the article to parse
 * @returns Parsed article data
 * @throws Error if parsing fails
 *
 * @example
 * ```typescript
 * try {
 *   const article = await parseArticleOrThrow('https://example.com/article')
 *   console.log(article.title)
 * } catch (error) {
 *   console.error('Failed to parse:', error.message)
 * }
 * ```
 */
export function parseArticleOrThrow(url: string): Promise<ParsedArticle>
