import { getReaderSourcesAction } from '@/app/actions/reader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, CheckCircle, Plus, Clock, FileText, Globe, Rss } from 'lucide-react'
import Link from 'next/link'
import { ReaderLibraryClient } from './reader-library-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reader Library | Full Tracker',
  description: 'Your saved articles and reading list with offline access',
}

export default async function ReaderLibraryPage() {
  const result = await getReaderSourcesAction()

  // Calculate statistics
  const sources = result.success ? result.sources : []
  const totalSources = sources.length
  const unreadCount = sources.filter((s) => !s.isRead).length
  const readCount = sources.filter((s) => s.isRead).length
  const inProgressCount = sources.filter((s) => !s.isRead && s.readingPosition > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reader Library</h1>
          <p className="text-muted-foreground mt-1">
            Your saved articles and reading list
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/highlights/import">
              <Plus className="mr-2 h-4 w-4" />
              Add Content
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/highlights/reader/feeds">
              <Rss className="h-4 w-4 mr-2" />
              RSS Feeds
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSources}</div>
            <p className="text-xs text-muted-foreground">Saved for reading</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">
              {inProgressCount > 0 && `${inProgressCount} in progress`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalSources > 0 && `${Math.round((readCount / totalSources) * 100)}% finished`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reading Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(sources.reduce((sum, s) => sum + (s.readingTimeMinutes || 0), 0) / 60)}h
            </div>
            <p className="text-xs text-muted-foreground">Total content</p>
          </CardContent>
        </Card>
      </div>

      {/* Articles List */}
      {sources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No articles saved</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Save web articles to read later with full offline access. Add your first article to get started.
            </p>
            <Button asChild>
              <Link href="/highlights/import">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Article
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ReaderLibraryClient sources={sources} />
      )}
    </div>
  )
}
