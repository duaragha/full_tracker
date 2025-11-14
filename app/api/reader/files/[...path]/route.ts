import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, normalize, sep } from 'path'
import { existsSync } from 'fs'

/**
 * API Route: Serve uploaded PDF/EPUB files
 *
 * Security features:
 * - Path traversal prevention
 * - File type validation
 * - Existence checks
 * - Proper MIME type headers
 *
 * Future enhancements:
 * - User authentication/authorization
 * - Rate limiting
 * - CDN integration
 * - Range request support for streaming
 */

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'reader')
const ALLOWED_EXTENSIONS = ['.pdf', '.epub']
const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.epub': 'application/epub+zip',
}

/**
 * Validate and sanitize file path to prevent directory traversal
 */
function validatePath(requestedPath: string): { valid: boolean; error?: string; sanitizedPath?: string } {
  // Decode URI components
  const decodedPath = decodeURIComponent(requestedPath)

  // Normalize the path to resolve .. and . segments
  const normalizedPath = normalize(decodedPath)

  // Check for directory traversal attempts
  if (normalizedPath.includes('..') || normalizedPath.startsWith(sep)) {
    return { valid: false, error: 'Invalid path: directory traversal not allowed' }
  }

  // Check file extension
  const extension = normalizedPath.substring(normalizedPath.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: `Invalid file type: only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed` }
  }

  // Construct full path
  const fullPath = join(UPLOADS_DIR, normalizedPath)

  // Verify the resolved path is still within UPLOADS_DIR
  if (!fullPath.startsWith(UPLOADS_DIR)) {
    return { valid: false, error: 'Invalid path: access outside uploads directory not allowed' }
  }

  return { valid: true, sanitizedPath: fullPath }
}

/**
 * GET /api/reader/files/[...path]
 * Serve PDF or EPUB files from uploads/reader directory
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Join path segments
    const requestedPath = params.path.join('/')

    if (!requestedPath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      )
    }

    // Validate and sanitize path
    const validation = validatePath(requestedPath)
    if (!validation.valid || !validation.sanitizedPath) {
      return NextResponse.json(
        { error: validation.error || 'Invalid path' },
        { status: 400 }
      )
    }

    const filePath = validation.sanitizedPath

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Get file stats
    const stats = await stat(filePath)

    // Ensure it's a file, not a directory
    if (!stats.isFile()) {
      return NextResponse.json(
        { error: 'Invalid file' },
        { status: 400 }
      )
    }

    // Read the file
    const fileBuffer = await readFile(filePath)

    // Determine MIME type from extension
    const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase()
    const mimeType = MIME_TYPES[extension] || 'application/octet-stream'

    // Return file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Disposition': 'inline', // Display in browser instead of download
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)

    return NextResponse.json(
      {
        error: 'Failed to serve file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * HEAD /api/reader/files/[...path]
 * Check if file exists without downloading it
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const requestedPath = params.path.join('/')

    if (!requestedPath) {
      return new NextResponse(null, { status: 400 })
    }

    const validation = validatePath(requestedPath)
    if (!validation.valid || !validation.sanitizedPath) {
      return new NextResponse(null, { status: 400 })
    }

    const filePath = validation.sanitizedPath

    if (!existsSync(filePath)) {
      return new NextResponse(null, { status: 404 })
    }

    const stats = await stat(filePath)

    if (!stats.isFile()) {
      return new NextResponse(null, { status: 400 })
    }

    const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase()
    const mimeType = MIME_TYPES[extension] || 'application/octet-stream'

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
      },
    })
  } catch (error) {
    console.error('Error checking file:', error)
    return new NextResponse(null, { status: 500 })
  }
}
