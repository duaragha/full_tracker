/**
 * Kindle My Clippings.txt Parser
 *
 * Parses the standard Kindle highlights export format.
 *
 * Format:
 * Book Title (Author Name)
 * - Your Highlight on page 42 | location 1234 | Added on Monday, January 1, 2024 12:00:00 PM
 *
 * The actual highlight text goes here.
 * ==========
 */

export interface ParsedKindleHighlight {
  bookTitle: string
  author: string | null
  highlightText: string
  location: number | null
  page: number | null
  date: Date | null
}

export interface KindleParseResult {
  highlights: ParsedKindleHighlight[]
  errors: Array<{ line: number; message: string; context?: string }>
  totalEntries: number
  successfullyParsed: number
}

const ENTRY_SEPARATOR = '=========='
const METADATA_PREFIX = '- Your Highlight'

/**
 * Parse the complete My Clippings.txt file
 */
export function parseKindleClippings(content: string): KindleParseResult {
  const result: KindleParseResult = {
    highlights: [],
    errors: [],
    totalEntries: 0,
    successfullyParsed: 0,
  }

  // Normalize line endings to \n
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Split by separator
  const entries = normalizedContent.split(ENTRY_SEPARATOR)

  result.totalEntries = entries.length

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i].trim()

    // Skip empty entries
    if (!entry) {
      continue
    }

    try {
      const parsed = parseKindleEntry(entry)
      if (parsed) {
        result.highlights.push(parsed)
        result.successfullyParsed++
      }
    } catch (error) {
      result.errors.push({
        line: i + 1,
        message: error instanceof Error ? error.message : 'Unknown parsing error',
        context: entry.substring(0, 100) + (entry.length > 100 ? '...' : ''),
      })
    }
  }

  return result
}

/**
 * Parse a single Kindle highlight entry
 */
function parseKindleEntry(entry: string): ParsedKindleHighlight | null {
  const lines = entry.split('\n').filter(line => line.trim())

  // Must have at least 3 lines: title, metadata, highlight text
  if (lines.length < 3) {
    return null
  }

  // Line 1: Book Title (Author)
  const titleLine = lines[0].trim()
  const { title, author } = parseTitleAndAuthor(titleLine)

  // Line 2: Metadata (location, page, date)
  const metadataLine = lines[1].trim()
  const { location, page, date } = parseMetadata(metadataLine)

  // Line 3+: Highlight text (may span multiple lines)
  const highlightText = lines.slice(2).join('\n').trim()

  // Skip if no highlight text
  if (!highlightText) {
    return null
  }

  return {
    bookTitle: title,
    author,
    highlightText,
    location,
    page,
    date,
  }
}

/**
 * Parse book title and author from first line
 * Format: "Book Title (Author Name)" or just "Book Title"
 */
function parseTitleAndAuthor(line: string): { title: string; author: string | null } {
  // Try to extract author in parentheses
  const match = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/)

  if (match) {
    return {
      title: match[1].trim(),
      author: match[2].trim(),
    }
  }

  // No author found, entire line is title
  return {
    title: line.trim(),
    author: null,
  }
}

/**
 * Parse metadata line containing location, page, and date
 * Format: "- Your Highlight on page 42 | location 1234 | Added on Monday, January 1, 2024 12:00:00 PM"
 * Or variations: "- Your Highlight at location 1234 | Added on..."
 */
function parseMetadata(line: string): {
  location: number | null
  page: number | null
  date: Date | null
} {
  const result = {
    location: null as number | null,
    page: null as number | null,
    date: null as Date | null,
  }

  // Extract page number
  const pageMatch = line.match(/page\s+(\d+)/i)
  if (pageMatch) {
    result.page = parseInt(pageMatch[1], 10)
  }

  // Extract location
  const locationMatch = line.match(/location\s+(\d+)/i)
  if (locationMatch) {
    result.location = parseInt(locationMatch[1], 10)
  }

  // Extract date
  const dateMatch = line.match(/Added on\s+(.+?)(?:\s*\||$)/i)
  if (dateMatch) {
    const dateStr = dateMatch[1].trim()
    const parsedDate = parseKindleDate(dateStr)
    if (parsedDate) {
      result.date = parsedDate
    }
  }

  return result
}

/**
 * Parse Kindle date format
 * Formats observed:
 * - "Monday, January 1, 2024 12:00:00 PM"
 * - "January 1, 2024 12:00:00 PM"
 * - "Monday, 1 January 2024, 12:00:00"
 */
function parseKindleDate(dateStr: string): Date | null {
  try {
    // Try direct parsing first
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }

    // Try removing day of week
    const withoutDay = dateStr.replace(/^[A-Za-z]+,\s*/, '')
    const date2 = new Date(withoutDay)
    if (!isNaN(date2.getTime())) {
      return date2
    }

    return null
  } catch {
    return null
  }
}

/**
 * Group highlights by book
 */
export function groupHighlightsByBook(
  highlights: ParsedKindleHighlight[]
): Map<string, ParsedKindleHighlight[]> {
  const grouped = new Map<string, ParsedKindleHighlight[]>()

  for (const highlight of highlights) {
    const key = `${highlight.bookTitle}|${highlight.author || 'Unknown'}`

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }

    grouped.get(key)!.push(highlight)
  }

  return grouped
}

/**
 * Remove duplicate highlights (same text from same book)
 */
export function deduplicateHighlights(
  highlights: ParsedKindleHighlight[]
): ParsedKindleHighlight[] {
  const seen = new Set<string>()
  const unique: ParsedKindleHighlight[] = []

  for (const highlight of highlights) {
    // Create a key from book + text (normalized)
    const normalizedText = highlight.highlightText
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
    const key = `${highlight.bookTitle}|${normalizedText}`

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(highlight)
    }
  }

  return unique
}

/**
 * Get statistics about parsed highlights
 */
export function getParseStats(result: KindleParseResult) {
  const byBook = groupHighlightsByBook(result.highlights)

  return {
    totalHighlights: result.highlights.length,
    totalBooks: byBook.size,
    averageHighlightsPerBook: result.highlights.length / byBook.size || 0,
    parseSuccessRate: result.totalEntries > 0
      ? (result.successfullyParsed / result.totalEntries) * 100
      : 0,
    errorCount: result.errors.length,
  }
}
