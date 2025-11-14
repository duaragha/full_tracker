import { getCollectionByIdAction, getCollectionHighlightsAction } from '@/app/actions/collections'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Folder } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const collectionId = parseInt(id)

  if (isNaN(collectionId)) {
    notFound()
  }

  const collection = await getCollectionByIdAction(collectionId)

  if (!collection) {
    notFound()
  }

  const highlights = await getCollectionHighlightsAction(collectionId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/highlights/collections">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collections
          </Link>
        </Button>
      </div>

      {/* Collection Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: collection.color || '#64748b' }}
            >
              <Folder className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{collection.name}</CardTitle>
              <CardDescription className="mt-2">
                {collection.description || 'No description'}
              </CardDescription>
              <div className="mt-4">
                <Badge variant="secondary">
                  {collection.highlightCount} {collection.highlightCount === 1 ? 'highlight' : 'highlights'}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Highlights */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Highlights</h2>
        {highlights.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No highlights in this collection yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {highlights.map((highlight) => (
              <Card key={highlight.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-3">
                        {highlight.text}
                      </CardTitle>
                      {highlight.note && (
                        <CardDescription className="mt-2">
                          Note: {highlight.note}
                        </CardDescription>
                      )}
                      {highlight.collectionNote && (
                        <CardDescription className="mt-2 italic">
                          Collection note: {highlight.collectionNote}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {highlight.source?.sourceType || 'Unknown'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{highlight.source?.title}</span>
                      {highlight.source?.author && (
                        <>
                          <span>•</span>
                          <span>{highlight.source.author}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {highlight.tags && highlight.tags.length > 0 && (
                        <div className="flex gap-1">
                          {highlight.tags.map((tag) => (
                            <Badge key={tag.id} variant="secondary" className="text-xs">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <time>
                        {new Date(highlight.highlightedAt).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
