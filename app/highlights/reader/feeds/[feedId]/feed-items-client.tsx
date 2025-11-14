'use client'

import { useState, useMemo } from 'react'
import { RSSFeedItem } from '@/lib/db/rss-feeds-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  importRSSFeedItemAction,
  importRSSFeedItemsBatchAction,
  deleteRSSFeedItemAction,
} from '@/app/actions/rss'
import {
  Search,
  Download,
  ExternalLink,
  Calendar,
  User,
  CheckCircle2,
  Loader2,
  Trash2,
  Filter,
  AlertCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FeedItemsClientProps {
  items: RSSFeedItem[]
  feedTitle: string
}

type FilterType = 'all' | 'unread' | 'imported'

export function FeedItemsClient({ items, feedTitle }: FeedItemsClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [importingIds, setImportingIds] = useState<Set<number>>(new Set())
  const [bulkImporting, setBulkImporting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())

  // Filter and search items
  const filteredItems = useMemo(() => {
    let result = [...items]

    // Apply filter
    if (filter === 'unread') {
      result = result.filter((item) => !item.isImported)
    } else if (filter === 'imported') {
      result = result.filter((item) => item.isImported)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.author?.toLowerCase().includes(query)
      )
    }

    return result
  }, [items, filter, searchQuery])

  const unreadItems = items.filter((item) => !item.isImported)

  const handleImport = async (itemId: number) => {
    setImportingIds((prev) => new Set(prev).add(itemId))

    try {
      const result = await importRSSFeedItemAction(itemId)

      if (result.success) {
        router.refresh()
      } else {
        alert(`Failed to import: ${result.error}`)
      }
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleBulkImport = async () => {
    if (unreadItems.length === 0) return

    if (
      !confirm(
        `Import ${unreadItems.length} unread items? This may take a few moments.`
      )
    ) {
      return
    }

    setBulkImporting(true)

    try {
      const result = await importRSSFeedItemsBatchAction(
        unreadItems.map((item) => item.id)
      )

      if (result.success) {
        alert(
          `Successfully imported ${result.successCount} of ${result.total} items`
        )
        router.refresh()
      } else {
        alert(`Failed to import items: ${result.error}`)
      }
    } finally {
      setBulkImporting(false)
    }
  }

  const handleDelete = async (itemId: number) => {
    if (!confirm('Delete this item? This cannot be undone.')) {
      return
    }

    setDeletingIds((prev) => new Set(prev).add(itemId))

    try {
      const result = await deleteRSSFeedItemAction(itemId)

      if (result.success) {
        router.refresh()
      } else {
        alert(`Failed to delete: ${result.error}`)
      }
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({items.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadItems.length})
              </Button>
              <Button
                variant={filter === 'imported' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('imported')}
              >
                Imported ({items.filter((i) => i.isImported).length})
              </Button>
            </div>

            {/* Bulk Import */}
            {unreadItems.length > 0 && (
              <Button
                onClick={handleBulkImport}
                disabled={bulkImporting}
                variant="secondary"
              >
                {bulkImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import All ({unreadItems.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Info */}
      {searchQuery && (
        <Alert>
          <Filter className="h-4 w-4" />
          <AlertTitle>Search Results</AlertTitle>
          <AlertDescription>
            Found {filteredItems.length} items matching "{searchQuery}"
          </AlertDescription>
        </Alert>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery
                ? 'Try adjusting your search query'
                : filter === 'unread'
                ? 'All items have been imported'
                : 'This filter has no items'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isImporting = importingIds.has(item.id)
            const isDeleting = deletingIds.has(item.id)

            return (
              <Card
                key={item.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">
                        {item.title}
                      </CardTitle>
                      {item.description && (
                        <CardDescription className="line-clamp-2 mt-1">
                          {item.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {item.isImported ? (
                        <>
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Imported
                          </Badge>
                          {item.sourceId && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/highlights/reader/${item.sourceId}`}>
                                View
                              </Link>
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleImport(item.id)}
                          disabled={isImporting || isDeleting || bulkImporting}
                        >
                          {isImporting ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-3 w-3" />
                              Import
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={isImporting || isDeleting || bulkImporting}
                        title="Delete item"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Original
                    </a>
                    {item.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(item.publishedAt)}
                      </span>
                    )}
                    {item.author && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {item.author}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
