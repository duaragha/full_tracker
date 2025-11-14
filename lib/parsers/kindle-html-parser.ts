import * as cheerio from 'cheerio'

export interface KindleHighlightFromHTML {
  bookTitle: string
  bookAuthor: string
  highlightText: string
  section?: string
  location?: number
  page?: number
  color?: 'yellow' | 'blue' | 'pink' | 'orange'
  note?: string
}

export interface KindleHTMLParseResult {
  success: boolean
  highlights: KindleHighlightFromHTML[]
  error?: string
  bookTitle?: string
  bookAuthor?: string
  highlightCount?: number
}

/**
 * Parse Kindle HTML Notebook Export
 *
 * Supports the HTML format exported from Kindle Desktop App:
 * - File format: "BookTitle-Notebook.html"
 * - Contains book title, author, and all highlights with locations
 *
 * Example structure:
 * ```html
 * <div class='bookTitle'>Book Title</div>
 * <div class='authors'>Author Name</div>
 * <h2 class='sectionHeading'>Chapter 1</h2>
 * <h3 class='noteHeading'>Highlight (yellow) - Location 123</h3>
 * <div class='noteText'>Highlight text here</div>
 * ```
 */
export function parseKindleHTMLNotebook(htmlContent: string): KindleHTMLParseResult {
  try {
    // Load cheerio for metadata extraction
    const $ = cheerio.load(htmlContent, { xmlMode: false })

    // Extract book metadata
    const bookTitle = $('.bookTitle').first().text().trim()
    const bookAuthor = $('.authors').first().text().trim() || 'Unknown Author'

    if (!bookTitle) {
      return {
        success: false,
        highlights: [],
        error: 'Could not find book title in HTML file. Make sure this is a valid Kindle Notebook export.',
      }
    }

    const highlights: KindleHighlightFromHTML[] = []

    // The HTML has completely broken tag structure (h3 closes with /div, div closes with /h3)
    // So we use regex to extract highlights instead of DOM traversal

    // Extract all section headings
    const sectionMatches = Array.from(htmlContent.matchAll(/<h2 class=['"]sectionHeading['"]>(.*?)<\/h2>/gi))
    const sections = sectionMatches.map((m) => ({
      text: m[1].trim(),
      index: m.index || 0,
    }))

    // Extract all highlights with their noteText
    // Pattern: <h3 class='noteHeading'>...heading...</WRONG_TAG><div class='noteText'>...text...</WRONG_TAG>
    const highlightPattern =
      /<h3 class=['"]noteHeading['"]>(.*?)<\/[^>]+><div class=['"]noteText['"]>(.*?)<\/[^>]+>/gi

    const highlightMatches = Array.from(htmlContent.matchAll(highlightPattern))

    for (const match of highlightMatches) {
      const headingText = match[1]
      let highlightText = match[2].trim()
      const matchIndex = match.index || 0

      // Find which section this highlight belongs to
      let currentSection: string | undefined
      for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i].index < matchIndex) {
          currentSection = sections[i].text
          break
        }
      }

      // Extract color from span
      let color: 'yellow' | 'blue' | 'pink' | 'orange' | undefined
      const colorMatch = headingText.match(/highlight_(\w+)/)
      if (colorMatch) {
        const colorStr = colorMatch[1].toLowerCase()
        if (['yellow', 'blue', 'pink', 'orange'].includes(colorStr)) {
          color = colorStr as 'yellow' | 'blue' | 'pink' | 'orange'
        }
      }

      // Extract location
      let location: number | undefined
      const locationMatch = headingText.match(/Location (\d+)/)
      if (locationMatch) {
        location = parseInt(locationMatch[1])
      }

      // Extract page
      let page: number | undefined
      const pageMatch = headingText.match(/Page (\d+)/)
      if (pageMatch) {
        page = parseInt(pageMatch[1])
      }

      // Clean up highlight text - remove any HTML entities
      highlightText = highlightText.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')

      if (highlightText && highlightText.length > 0) {
        highlights.push({
          bookTitle,
          bookAuthor,
          highlightText,
          section: currentSection,
          location,
          page,
          color,
        })
      }
    }

    if (highlights.length === 0) {
      return {
        success: false,
        highlights: [],
        error: 'No highlights found in HTML file. The file may be empty or in an unexpected format.',
      }
    }

    return {
      success: true,
      highlights,
      bookTitle,
      bookAuthor,
      highlightCount: highlights.length,
    }
  } catch (error) {
    console.error('[Kindle HTML Parser] Error parsing HTML:', error)
    return {
      success: false,
      highlights: [],
      error: error instanceof Error ? error.message : 'Failed to parse HTML file',
    }
  }
}

/**
 * Convenience function to parse Kindle HTML from file upload
 */
export async function parseKindleHTMLFromFile(file: File): Promise<KindleHTMLParseResult> {
  try {
    const htmlContent = await file.text()
    return parseKindleHTMLNotebook(htmlContent)
  } catch (error) {
    return {
      success: false,
      highlights: [],
      error: error instanceof Error ? error.message : 'Failed to read file',
    }
  }
}
