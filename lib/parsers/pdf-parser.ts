import { getDocument, PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'

export interface PDFMetadata {
  title?: string
  author?: string
  creator?: string
  producer?: string
  subject?: string
  keywords?: string
  creationDate?: Date
  modificationDate?: Date
  pageCount: number
}

export interface PDFParseResult {
  metadata: PDFMetadata
  textContent: string
  pageTexts: string[]
}

/**
 * Parse PDF file and extract metadata and text content
 */
export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  // Initialize PDF.js with buffer
  const pdfData = new Uint8Array(buffer)

  const loadingTask = getDocument({
    data: pdfData,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })

  const pdf: PDFDocumentProxy = await loadingTask.promise

  // Extract metadata
  const pdfMetadata = await pdf.getMetadata()
  const info = pdfMetadata.info as any

  const metadata: PDFMetadata = {
    title: info?.Title || undefined,
    author: info?.Author || undefined,
    creator: info?.Creator || undefined,
    producer: info?.Producer || undefined,
    subject: info?.Subject || undefined,
    keywords: info?.Keywords || undefined,
    creationDate: info?.CreationDate ? parsePDFDate(info.CreationDate) : undefined,
    modificationDate: info?.ModDate ? parsePDFDate(info.ModDate) : undefined,
    pageCount: pdf.numPages,
  }

  // Extract text from all pages
  const pageTexts: string[] = []
  let fullText = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .trim()

    pageTexts.push(pageText)
    fullText += pageText + '\n\n'
  }

  return {
    metadata,
    textContent: fullText.trim(),
    pageTexts,
  }
}

/**
 * Parse PDF date string (format: D:YYYYMMDDHHmmSSOHH'mm')
 */
function parsePDFDate(dateString: string): Date | undefined {
  try {
    // Remove D: prefix if present
    const cleaned = dateString.replace(/^D:/, '')

    // Extract components
    const year = parseInt(cleaned.substring(0, 4))
    const month = parseInt(cleaned.substring(4, 6)) - 1 // JS months are 0-indexed
    const day = parseInt(cleaned.substring(6, 8))
    const hour = parseInt(cleaned.substring(8, 10) || '0')
    const minute = parseInt(cleaned.substring(10, 12) || '0')
    const second = parseInt(cleaned.substring(12, 14) || '0')

    return new Date(year, month, day, hour, minute, second)
  } catch {
    return undefined
  }
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
