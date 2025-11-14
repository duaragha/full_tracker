import { getRSSFeedsAction } from '@/app/actions/rss'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RSSFeedCard } from '@/components/reader/rss-feed-card'
import { RSSSubscribeDialog } from '@/components/reader/rss-subscribe-dialog'
import { Badge } from '@/components/ui/badge'
import { Rss, AlertCircle, RefreshCw } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RSS Feeds | Full Tracker',
  description: 'Manage your RSS feed subscriptions',
}

export default async function RSSFeedsPage() {
  const result = await getRSSFeedsAction()
  const feeds = result.success ? result.feeds : []

  // Calculate statistics
  const activeFeeds = feeds.filter((f) => f.isActive).length
  const totalUnread = feeds.reduce((sum, f) => sum + (f.unimportedCount || 0), 0)
  const totalItems = feeds.reduce((sum, f) => sum + (f.itemCount || 0), 0)
  const failedFeeds = feeds.filter((f) => f.consecutiveErrors > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Rss className="h-8 w-8" />
            RSS Feeds
          </h1>
          <p className="text-muted-foreground mt-1">
            Subscribe to and manage your RSS feed subscriptions
          </p>
        </div>
        <RSSSubscribeDialog />
      </div>

      {/* Stats */}
      {feeds.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feeds</CardTitle>
              <Rss className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{feeds.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeFeeds} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Items</CardTitle>
              <Badge variant="default">{totalUnread}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUnread}</div>
              <p className="text-xs text-muted-foreground">
                Ready to import
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">
                All feed items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feed Health</CardTitle>
              {failedFeeds > 0 ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {feeds.length - failedFeeds}
              </div>
              <p className="text-xs text-muted-foreground">
                {failedFeeds > 0 ? `${failedFeeds} with errors` : 'All healthy'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feeds List */}
      {feeds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Rss className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No RSS feeds yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Subscribe to RSS feeds from your favorite blogs and websites. New articles will be automatically fetched and ready to import into your reader.
            </p>
            <RSSSubscribeDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {feeds.map((feed) => (
            <RSSFeedCard key={feed.id} feed={feed} />
          ))}
        </div>
      )}
    </div>
  )
}
