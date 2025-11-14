'use client'

import { RSSFeed } from '@/lib/db/rss-feeds-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Trash2, Globe, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { refreshRSSFeedAction, deleteRSSFeedAction } from '@/app/actions/rss'
import { useRouter } from 'next/navigation'

interface RSSFeedCardProps {
  feed: RSSFeed
}

export function RSSFeedCard({ feed }: RSSFeedCardProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const result = await refreshRSSFeedAction(feed.id)
      if (result.success) {
        router.refresh()
      } else {
        console.error('Failed to refresh feed:', result.error)
        alert(`Failed to refresh feed: ${result.error}`)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${feed.title}"? This will remove all unimported items.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteRSSFeedAction(feed.id)
      if (result.success) {
        router.refresh()
      } else {
        console.error('Failed to delete feed:', result.error)
        alert(`Failed to delete feed: ${result.error}`)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const unreadCount = feed.unimportedCount || 0
  const totalItems = feed.itemCount || 0
  const hasError = feed.lastError && feed.consecutiveErrors > 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/highlights/reader/feeds/${feed.id}`}
              className="hover:underline"
            >
              <CardTitle className="text-lg truncate">{feed.title}</CardTitle>
            </Link>
            {feed.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {feed.description}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isDeleting}
              title="Refresh feed"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleDelete}
              disabled={isRefreshing || isDeleting}
              title="Delete feed"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            {unreadCount > 0 && (
              <Badge variant="default">
                {unreadCount} unread
              </Badge>
            )}
            <Badge variant="secondary">
              {totalItems} total items
            </Badge>
            {!feed.isActive && (
              <Badge variant="outline">Paused</Badge>
            )}
          </div>

          {/* Feed Info */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <a
                href={feed.siteUrl || feed.feedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground truncate"
              >
                {feed.siteUrl || feed.feedUrl}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Last updated: {formatDate(feed.lastFetchedAt)}</span>
            </div>
          </div>

          {/* Error Status */}
          {hasError ? (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Failed to fetch</div>
                <div className="text-xs opacity-90 truncate">{feed.lastError}</div>
                {feed.consecutiveErrors > 1 && (
                  <div className="text-xs opacity-75 mt-1">
                    {feed.consecutiveErrors} consecutive errors
                  </div>
                )}
              </div>
            </div>
          ) : feed.lastFetchedAt && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Feed healthy</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
