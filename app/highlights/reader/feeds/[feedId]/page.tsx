import { getRSSFeedByIdAction, getRSSFeedItemsAction } from '@/app/actions/rss'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ExternalLink, Calendar, User, FileText, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { FeedItemsClient } from './feed-items-client'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface FeedItemsPageProps {
  params: {
    feedId: string
  }
}

export async function generateMetadata({ params }: FeedItemsPageProps): Promise<Metadata> {
  const feedId = parseInt(params.feedId)
  if (isNaN(feedId)) {
    return { title: 'Feed Not Found' }
  }

  const feedResult = await getRSSFeedByIdAction(feedId)

  if (!feedResult.success || !feedResult.feed) {
    return { title: 'Feed Not Found' }
  }

  return {
    title: `${feedResult.feed.title} | RSS Feeds`,
    description: feedResult.feed.description || `Items from ${feedResult.feed.title}`,
  }
}

export default async function FeedItemsPage({ params }: FeedItemsPageProps) {
  const feedId = parseInt(params.feedId)

  if (isNaN(feedId)) {
    notFound()
  }

  // Fetch feed and items
  const [feedResult, itemsResult] = await Promise.all([
    getRSSFeedByIdAction(feedId),
    getRSSFeedItemsAction({ feedId }),
  ])

  if (!feedResult.success || !feedResult.feed) {
    notFound()
  }

  const feed = feedResult.feed
  const items = itemsResult.success ? itemsResult.items : []

  // Calculate statistics
  const unreadItems = items.filter((item) => !item.isImported)
  const importedItems = items.filter((item) => item.isImported)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/highlights/reader/feeds">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Feeds
        </Link>
      </Button>

      {/* Feed Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight truncate">
              {feed.title}
            </h1>
            {feed.description && (
              <p className="text-muted-foreground mt-1">
                {feed.description}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Badge variant={feed.isActive ? 'default' : 'secondary'}>
              {feed.isActive ? 'Active' : 'Paused'}
            </Badge>
          </div>
        </div>

        {/* Feed Info */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {feed.siteUrl && (
            <a
              href={feed.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visit Website
            </a>
          )}
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {items.length} total items
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">
              All feed items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Badge variant="default">{unreadItems.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready to import
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imported</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{importedItems.length}</div>
            <p className="text-xs text-muted-foreground">
              In your library
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No items yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              This feed hasn't been fetched yet or doesn't have any items.
              Try refreshing the feed from the feeds list.
            </p>
            <Button asChild>
              <Link href="/highlights/reader/feeds">
                Back to Feeds
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <FeedItemsClient items={items} feedTitle={feed.title} />
      )}
    </div>
  )
}
