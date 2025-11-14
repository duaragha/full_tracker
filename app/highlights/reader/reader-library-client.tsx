'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { BookOpen, CheckCircle, Clock, Search, Globe, Calendar } from 'lucide-react'
import Link from 'next/link'

type ReaderSource = {
  id: number
  title: string
  author: string | null
  url: string | null
  domain: string | null
  sourceType: string
  wordCount: number
  readingTimeMinutes: number
  isRead: boolean
  readingPosition: number
  lastReadAt: string | null
  createdAt: string
  excerpt: string
}

type FilterType = 'all' | 'unread' | 'read'
type SortType = 'recent' | 'reading_time' | 'title'

interface ReaderLibraryClientProps {
  sources: ReaderSource[]
}

export function ReaderLibraryClient({ sources }: ReaderLibraryClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('recent')

  // Filter and sort sources
  const filteredSources = useMemo(() => {
    let filtered = sources

    // Apply filter
    if (filter === 'unread') {
      filtered = filtered.filter((s) => !s.isRead)
    } else if (filter === 'read') {
      filtered = filtered.filter((s) => s.isRead)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.author?.toLowerCase().includes(query) ||
          s.domain?.toLowerCase().includes(query) ||
          s.excerpt?.toLowerCase().includes(query)
      )
    }

    // Apply sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = a.lastReadAt || a.createdAt
        const dateB = b.lastReadAt || b.createdAt
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      } else if (sortBy === 'reading_time') {
        return a.readingTimeMinutes - b.readingTimeMinutes
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      }
      return 0
    })

    return filtered
  }, [sources, filter, sortBy, searchQuery])

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search articles by title, author, or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({sources.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                Unread ({sources.filter((s) => !s.isRead).length})
              </Button>
              <Button
                variant={filter === 'read' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('read')}
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Read ({sources.filter((s) => s.isRead).length})
              </Button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              >
                <option value="recent">Recently Added</option>
                <option value="reading_time">Reading Time</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Found {filteredSources.length} {filteredSources.length === 1 ? 'article' : 'articles'}
        </p>
      )}

      {/* Articles Grid */}
      {filteredSources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold mb-1">No articles found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery
                ? 'Try adjusting your search query'
                : filter === 'unread'
                ? "You don't have any unread articles"
                : "You don't have any read articles"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSources.map((source) => (
            <Link key={source.id} href={`/highlights/read/${source.id}`}>
              <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {source.domain && (
                        <Badge variant="outline" className="shrink-0">
                          <Globe className="mr-1 h-3 w-3" />
                          {source.domain}
                        </Badge>
                      )}
                    </div>
                    {source.isRead ? (
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                    {source.title}
                  </CardTitle>
                  {source.author && (
                    <CardDescription className="text-sm">
                      by {source.author}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Excerpt */}
                  {source.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {source.excerpt}
                    </p>
                  )}

                  {/* Reading Progress */}
                  {!source.isRead && source.readingPosition > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{source.readingPosition}% complete</span>
                      </div>
                      <Progress value={source.readingPosition} className="h-1.5" />
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{source.readingTimeMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{source.wordCount.toLocaleString()} words</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(source.lastReadAt || source.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
