import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { ArticleReader } from '@/components/reader/article-reader'
import { PDFReader } from '@/components/reader/pdf-reader'
import { EPUBReader } from '@/components/reader/epub-reader'
import { getSourceByIdAction, getHighlightsAction } from '@/app/actions/highlights'
import { HighlightSource } from '@/types/highlight'

interface ReadPageProps {
  params: Promise<{
    sourceId: string
  }>
}

export async function generateMetadata({ params }: ReadPageProps): Promise<Metadata> {
  const { sourceId: sourceIdStr } = await params
  const sourceId = parseInt(sourceIdStr)

  if (isNaN(sourceId)) {
    return { title: 'Content Not Found' }
  }

  const source = await getSourceByIdAction(sourceId)

  if (!source) {
    return { title: 'Content Not Found' }
  }

  return {
    title: source.title,
    description: source.excerpt || `Read and highlight ${source.title}`,
  }
}

/**
 * Determine source type from database fields
 */
function getSourceType(source: HighlightSource): 'pdf' | 'epub' | 'web_article' {
  // First check explicit source_type field
  if (source.sourceType === 'pdf') {
    return 'pdf'
  }

  // Check if it's an EPUB (sourceType or file extension)
  if (source.sourceType === 'epub' || source.fileStoragePath?.toLowerCase().endsWith('.epub')) {
    return 'epub'
  }

  // Check if file path indicates PDF
  if (source.fileStoragePath?.toLowerCase().endsWith('.pdf')) {
    return 'pdf'
  }

  // Check MIME type
  if (source.fileMimeType === 'application/pdf') {
    return 'pdf'
  }

  if (source.fileMimeType === 'application/epub+zip') {
    return 'epub'
  }

  // Default to web article
  return 'web_article'
}

export default async function ReadPage({ params }: ReadPageProps) {
  const { sourceId: sourceIdStr } = await params
  const sourceId = parseInt(sourceIdStr)

  if (isNaN(sourceId)) {
    notFound()
  }

  // Fetch source data
  const source = await getSourceByIdAction(sourceId)

  if (!source) {
    notFound()
  }

  // Fetch existing highlights for this source
  const highlights = await getHighlightsAction({
    sourceId,
    limit: 1000, // Get all highlights
  })

  // Determine the source type and render appropriate reader
  const sourceType = getSourceType(source)

  // Render PDF Reader
  if (sourceType === 'pdf') {
    if (!source.fileStoragePath) {
      return (
        <div className="container mx-auto py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">PDF File Not Found</h1>
            <p className="text-muted-foreground">
              The PDF file for this source is missing or has been deleted.
            </p>
          </div>
        </div>
      )
    }

    return (
      <PDFReader
        sourceId={source.id}
        title={source.title}
        fileUrl={`/api/reader/files/${source.fileStoragePath}`}
        existingHighlights={highlights.map((h) => ({
          id: h.id,
          text: h.text,
          color: h.color || 'yellow',
          location: h.location || {
            page: 1,
            startOffset: h.locationStart || 0,
            endOffset: h.locationEnd || 0,
          },
        }))}
      />
    )
  }

  // Render EPUB Reader
  if (sourceType === 'epub') {
    if (!source.fileStoragePath) {
      return (
        <div className="container mx-auto py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">EPUB File Not Found</h1>
            <p className="text-muted-foreground">
              The EPUB file for this source is missing or has been deleted.
            </p>
          </div>
        </div>
      )
    }

    return (
      <EPUBReader
        sourceId={source.id}
        title={source.title}
        fileUrl={`/api/reader/files/${source.fileStoragePath}`}
        existingHighlights={highlights.map((h) => ({
          id: h.id,
          text: h.text,
          color: h.color || 'yellow',
          location: h.location,
        }))}
      />
    )
  }

  // Render Article Reader (web_article)
  const htmlContent = source.fullContentHtml || source.content || ''

  if (!htmlContent) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">No Content Available</h1>
          <p className="text-muted-foreground">
            This article has no content to display. It may have failed to load or the content may have been removed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto">
      <ArticleReader
        sourceId={source.id}
        title={source.title}
        author={source.author || undefined}
        htmlContent={htmlContent}
        existingHighlights={highlights.map((h) => ({
          id: h.id,
          text: h.text,
          color: h.color || 'yellow',
          location: h.location,
          locationStart: h.locationStart,
          locationEnd: h.locationEnd,
        }))}
      />
    </div>
  )
}
