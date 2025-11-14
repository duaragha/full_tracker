import ePub from 'epubjs'
import { Book } from 'epubjs'

export interface EPUBMetadata {
  title?: string
  author?: string
  publisher?: string
  language?: string
  description?: string
  pubdate?: string
  identifier?: string
  rights?: string
  chapters: number
}

export interface EPUBParseResult {
  metadata: EPUBMetadata
  textContent: string
  chapterTexts: string[]
}

/**
 * Parse EPUB file and extract metadata and text content
 */
export async function parseEPUB(buffer: Buffer): Promise<EPUBParseResult> {
  // Create a Book instance from buffer
  const book: Book = ePub()
  await book.open(buffer)

  // Load metadata
  await book.loaded.metadata
  await book.loaded.spine
  await book.loaded.navigation

  const bookMetadata = await book.loaded.metadata
  const spine = await book.loaded.spine

  const metadata: EPUBMetadata = {
    title: bookMetadata.title || undefined,
    author: bookMetadata.creator || undefined,
    publisher: bookMetadata.publisher || undefined,
    language: bookMetadata.language || undefined,
    description: bookMetadata.description || undefined,
    pubdate: bookMetadata.pubdate || undefined,
    identifier: bookMetadata.identifier || undefined,
    rights: bookMetadata.rights || undefined,
    chapters: spine.length,
  }

  // Extract text from all chapters
  const chapterTexts: string[] = []
  let fullText = ''

  for (const spineItem of spine.items) {
    try {
      const section = book.spine.get(spineItem.href)
      if (!section) continue

      // Load the section
      await section.load(book.load.bind(book))

      // Get text content
      const doc = section.document
      if (doc) {
        const text = extractTextFromHTML(doc.body?.innerHTML || '')
        chapterTexts.push(text)
        fullText += text + '\n\n'
      }

      // Unload to free memory
      section.unload()
    } catch (error) {
      console.error(`Error parsing chapter ${spineItem.href}:`, error)
    }
  }

  // Clean up
  book.destroy()

  return {
    metadata,
    textContent: fullText.trim(),
    chapterTexts,
  }
}

/**
 * Extract plain text from HTML content
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Replace common HTML tags with appropriate spacing
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<\/li>/gi, '\n')

  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = decodeHTMLEntities(text)

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
  text = text.replace(/[ \t]+/g, ' ') // Normalize spaces
  text = text.trim()

  return text
}

/**
 * Decode common HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
  }

  let decoded = text
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char)
  }

  // Decode numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(dec)
  })
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })

  return decoded
}

/**
 * Calculate word count from text
 */
export function calculateWordCount(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Calculate estimated reading time in minutes (assumes 200 words per minute)
 */
export function calculateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 200)
}
