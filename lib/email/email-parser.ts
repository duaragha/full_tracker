/**
 * Email Parser Utility
 *
 * Parses incoming emails for the email-to-reader feature.
 * Extracts URLs, article content, and metadata from email bodies.
 */

export interface ParsedEmail {
  urls: string[]
  subject: string | null
  plainTextBody: string | null
  htmlBody: string | null
  fromAddress: string
  toAddress: string
  hasInlineContent: boolean
  inlineContent?: string
}

export interface EmailParseError {
  error: string
  details?: string
}

/**
 * URL regex pattern - matches http/https URLs
 */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi

/**
 * Extract URLs from text content
 * @param text - Text to extract URLs from
 * @returns Array of unique URLs
 */
export function extractUrls(text: string): string[] {
  if (!text) return []

  const matches = text.match(URL_REGEX) || []

  // Remove duplicates and filter out common tracking/unsubscribe URLs
  const uniqueUrls = [...new Set(matches)]
    .filter(url => {
      const lowerUrl = url.toLowerCase()
      return (
        !lowerUrl.includes('unsubscribe') &&
        !lowerUrl.includes('tracking') &&
        !lowerUrl.includes('pixel') &&
        !lowerUrl.includes('beacon') &&
        !lowerUrl.includes('click.email') &&
        !lowerUrl.endsWith('.png') &&
        !lowerUrl.endsWith('.jpg') &&
        !lowerUrl.endsWith('.gif') &&
        !lowerUrl.endsWith('.svg')
      )
    })
    .map(url => {
      // Clean up URLs - remove trailing punctuation
      return url.replace(/[.,;!?)\]]+$/, '')
    })

  return uniqueUrls
}

/**
 * Strip HTML tags from content
 * @param html - HTML content
 * @returns Plain text content
 */
export function stripHtml(html: string): string {
  if (!html) return ''

  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&') // Replace &amp;
    .replace(/&lt;/g, '<') // Replace &lt;
    .replace(/&gt;/g, '>') // Replace &gt;
    .replace(/&quot;/g, '"') // Replace &quot;
    .replace(/&#39;/g, "'") // Replace &#39;
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
}

/**
 * Extract article content from email body if pasted inline
 * Looks for substantial text content that might be an article
 * @param text - Email body text
 * @returns Article content if found, null otherwise
 */
export function extractInlineContent(text: string): string | null {
  if (!text) return null

  const cleanText = text.trim()

  // Require minimum length for inline content (500 characters)
  if (cleanText.length < 500) return null

  // Count number of paragraphs (lines with substantial content)
  const paragraphs = cleanText
    .split('\n')
    .filter(line => line.trim().length > 50)

  // Require at least 3 substantial paragraphs
  if (paragraphs.length < 3) return null

  return cleanText
}

/**
 * Clean email body by removing common email signatures and footers
 * @param text - Email body text
 * @returns Cleaned text
 */
export function cleanEmailBody(text: string): string {
  if (!text) return ''

  let cleaned = text

  // Remove common signature markers
  const signaturePatterns = [
    /^--\s*$/m, // -- signature delimiter
    /^_{3,}$/m, // Underscores
    /^Sent from my (iPhone|iPad|Android|BlackBerry)/mi,
    /^Get Outlook for (iOS|Android)/mi,
  ]

  for (const pattern of signaturePatterns) {
    const match = cleaned.match(pattern)
    if (match && match.index !== undefined) {
      cleaned = cleaned.substring(0, match.index).trim()
    }
  }

  return cleaned.trim()
}

/**
 * Extract token from email address
 * Supports formats like:
 * - username-TOKEN@reader.domain.com
 * - reader+TOKEN@domain.com
 * @param emailAddress - Full email address
 * @returns Token string or null
 */
export function extractTokenFromEmail(emailAddress: string): string | null {
  if (!emailAddress) return null

  const email = emailAddress.toLowerCase().trim()

  // Format 1: username-TOKEN@domain
  const dashMatch = email.match(/^[^-]+-([a-f0-9]+)@/)
  if (dashMatch) return dashMatch[1]

  // Format 2: reader+TOKEN@domain
  const plusMatch = email.match(/\+([a-f0-9]+)@/)
  if (plusMatch) return plusMatch[1]

  return null
}

/**
 * Parse raw email webhook data
 * Supports common email service formats (Mailgun, SendGrid, etc.)
 * @param webhookData - Raw webhook data from email service
 * @returns Parsed email data or error
 */
export function parseEmailWebhook(webhookData: any): ParsedEmail | EmailParseError {
  try {
    // Validate webhook data
    if (!webhookData || typeof webhookData !== 'object') {
      return {
        error: 'Invalid webhook data',
        details: 'Expected an object with email data',
      }
    }

    // Extract fields (supports multiple formats)
    const fromAddress = webhookData.from || webhookData.sender || webhookData.From || ''
    const toAddress = webhookData.to || webhookData.recipient || webhookData.To || ''
    const subject = webhookData.subject || webhookData.Subject || null
    const htmlBody = webhookData.html || webhookData['body-html'] || webhookData.Html || null
    const plainTextBody = webhookData.text || webhookData['body-plain'] || webhookData.Text || null

    // Validate required fields
    if (!fromAddress) {
      return {
        error: 'Missing sender address',
        details: 'Email must have a from/sender field',
      }
    }

    if (!toAddress) {
      return {
        error: 'Missing recipient address',
        details: 'Email must have a to/recipient field',
      }
    }

    // Get email body (prefer plain text, fall back to HTML)
    let bodyText = plainTextBody
    if (!bodyText && htmlBody) {
      bodyText = stripHtml(htmlBody)
    }

    if (!bodyText) {
      return {
        error: 'Empty email body',
        details: 'Email must contain text or HTML content',
      }
    }

    // Clean email body
    const cleanedBody = cleanEmailBody(bodyText)

    // Extract URLs
    const urls = extractUrls(cleanedBody)

    // Check for inline content
    const inlineContent = extractInlineContent(cleanedBody)
    const hasInlineContent = inlineContent !== null

    return {
      urls,
      subject,
      plainTextBody,
      htmlBody,
      fromAddress,
      toAddress,
      hasInlineContent,
      inlineContent: inlineContent || undefined,
    }
  } catch (error) {
    return {
      error: 'Email parsing failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Type guard to check if parse result is an error
 * @param result - Parse result to check
 * @returns True if result is an error
 */
export function isEmailParseError(result: ParsedEmail | EmailParseError): result is EmailParseError {
  return 'error' in result
}

/**
 * Validate email token format
 * @param token - Token to validate
 * @returns True if token is valid format
 */
export function isValidEmailToken(token: string): boolean {
  if (!token) return false

  // Token should be 12-18 character alphanumeric string
  return /^[a-f0-9]{12,18}$/i.test(token)
}
