import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { parsePDF, calculateWordCount as pdfWordCount, calculateReadingTime as pdfReadingTime } from '@/lib/parsers/pdf-parser'
import { parseEPUB, calculateWordCount as epubWordCount, calculateReadingTime as epubReadingTime } from '@/lib/parsers/epub-parser'
import { createSource } from '@/lib/db/highlight-sources-store'
import { SourceType } from '@/types/highlight'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['application/pdf', 'application/epub+zip']
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'reader')

interface UploadResult {
  success: boolean
  sourceId?: number
  error?: string
  details?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResult>> {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type',
          details: 'Only PDF and EPUB files are supported',
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large',
          details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Calculate SHA256 hash for deduplication
    const hash = createHash('sha256').update(buffer).digest('hex')

    // Check for existing file with same hash
    const existingSource = await pool.query(
      'SELECT id FROM sources WHERE file_hash = $1',
      [hash]
    )

    if (existingSource.rows.length > 0) {
      return NextResponse.json({
        success: true,
        sourceId: existingSource.rows[0].id,
      })
    }

    // Parse file based on type
    let metadata: any
    let textContent: string
    let wordCount: number
    let readingTimeMinutes: number
    let sourceType: SourceType
    let totalPages: number | undefined

    if (file.type === 'application/pdf') {
      const result = await parsePDF(buffer)
      metadata = result.metadata
      textContent = result.textContent
      wordCount = pdfWordCount(textContent)
      readingTimeMinutes = pdfReadingTime(wordCount)
      sourceType = 'pdf'
      totalPages = metadata.pageCount
    } else {
      // EPUB
      const result = await parseEPUB(buffer)
      metadata = result.metadata
      textContent = result.textContent
      wordCount = epubWordCount(textContent)
      readingTimeMinutes = epubReadingTime(wordCount)
      sourceType = 'pdf' // Use 'pdf' as sourceType for now since EPUB is not in the enum
      totalPages = metadata.chapters
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.type === 'application/pdf' ? 'pdf' : 'epub'
    const safeFileName = `${hash.substring(0, 16)}_${timestamp}.${extension}`
    const filePath = join(UPLOAD_DIR, safeFileName)

    // Save file to disk
    await writeFile(filePath, buffer)

    // Create source record in database
    const title = metadata.title || file.name.replace(/\.(pdf|epub)$/i, '')
    const author = metadata.author || metadata.creator

    // Extract excerpt from first 500 characters
    const excerpt = textContent.substring(0, 500).trim() + (textContent.length > 500 ? '...' : '')

    const source = await createSource({
      sourceType,
      title,
      author,
      content: textContent,
      excerpt,
    })

    // Update source with file metadata
    await pool.query(
      `UPDATE sources SET
        file_storage_path = $1,
        file_size_bytes = $2,
        file_hash = $3,
        total_pages = $4,
        word_count = $5,
        reading_time_minutes = $6,
        full_content = $7,
        file_mime_type = $8
      WHERE id = $9`,
      [
        `reader/${safeFileName}`,
        BigInt(file.size),
        hash,
        totalPages || null,
        wordCount,
        readingTimeMinutes,
        textContent,
        file.type,
        source.id,
      ]
    )

    return NextResponse.json({
      success: true,
      sourceId: source.id,
    })
  } catch (error) {
    console.error('File upload error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
