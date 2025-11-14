import { getHighlightsAction, getSourcesAction, getHighlightsCountAction } from '@/app/actions/highlights'
import { getReviewStatsAction } from '@/app/actions/reviews'
import { getTagsAction } from '@/app/actions/tags'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookMarked, FileText, Globe, Plus, Sparkles, Brain, Tag as TagIcon, Folder, Download, BookOpen } from 'lucide-react'
import { ReviewStatsCard } from '@/components/review-stats-card'
import { HighlightSearch } from '@/components/highlight-search'
import { HighlightFilters } from '@/components/highlight-filters'
import { HighlightsClient } from './highlights-client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HighlightsPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string
    sourceType?: string
    tagIds?: string
    hasNotes?: string
    color?: string
    startDate?: string
    endDate?: string
    sort?: string
  }>
}) {
  const params = await searchParams

  // Parse filters from URL
  const filters: any = {
    query: params.query,
    sourceType: params.sourceType as any,
    limit: 50,
  }

  if (params.tagIds) {
    filters.tagIds = params.tagIds.split(',').map(Number).filter(n => !isNaN(n))
  }

  if (params.hasNotes) {
    filters.hasNotes = params.hasNotes === 'true'
  }

  if (params.startDate) {
    filters.startDate = params.startDate
  }

  if (params.endDate) {
    filters.endDate = params.endDate
  }

  const [highlights, sources, totalCount, reviewStats, tags] = await Promise.all([
    getHighlightsAction(filters),
    getSourcesAction({ limit: 10 }),
    getHighlightsCountAction(),
    getReviewStatsAction(),
    getTagsAction({ includeEmpty: false, sortBy: 'count' }),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Highlights</h1>
          <p className="text-muted-foreground mt-1">
            Capture, organize, and review your knowledge
          </p>
        </div>
        <div className="flex gap-2">
          {reviewStats.dueToday > 0 && (
            <Button asChild variant="default" className="relative">
              <Link href="/highlights/review">
                <Brain className="mr-2 h-4 w-4" />
                Review Now
                <Badge className="ml-2 bg-primary-foreground text-primary">
                  {reviewStats.dueToday}
                </Badge>
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/highlights/reader">
              <BookOpen className="mr-2 h-4 w-4" />
              Reader
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/highlights/tags">
              <TagIcon className="mr-2 h-4 w-4" />
              Tags
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/highlights/collections">
              <Folder className="mr-2 h-4 w-4" />
              Collections
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/highlights/export">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Link>
          </Button>
          <Button asChild variant={reviewStats.dueToday > 0 ? "outline" : "default"}>
            <Link href="/highlights/import">
              <Plus className="mr-2 h-4 w-4" />
              Add Highlight
            </Link>
          </Button>
        </div>
      </div>

      {/* Review Stats */}
      {reviewStats.totalReviews > 0 && (
        <ReviewStatsCard
          dueToday={reviewStats.dueToday}
          totalReviews={reviewStats.totalReviews}
          correctReviews={reviewStats.correctReviews}
          currentStreak={reviewStats.currentStreak}
          nextReviewDate={reviewStats.nextReviewDate}
        />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Highlights</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              From {sources.length} sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Books</CardTitle>
            <BookMarked className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sources.filter(s => s.sourceType === 'kindle' || s.sourceType === 'book').length}
            </div>
            <p className="text-xs text-muted-foreground">Kindle & books</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sources.filter(s => s.sourceType === 'web_article').length}
            </div>
            <p className="text-xs text-muted-foreground">Web articles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PDFs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sources.filter(s => s.sourceType === 'pdf').length}
            </div>
            <p className="text-xs text-muted-foreground">Documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <HighlightSearch
            initialQuery={params.query || ''}
            initialSort={params.sort || 'date_desc'}
          />
          <HighlightFilters
            tags={tags}
            initialFilters={{
              sourceType: params.sourceType as any,
              tagIds: params.tagIds?.split(',').map(Number).filter(n => !isNaN(n)),
              hasNotes: params.hasNotes === 'true' ? true : undefined,
              color: params.color || undefined,
              startDate: params.startDate ? new Date(params.startDate) : undefined,
              endDate: params.endDate ? new Date(params.endDate) : undefined,
            }}
          />
        </CardContent>
      </Card>

      {/* Highlights List */}
      {highlights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No highlights found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {params.query || params.sourceType || params.tagIds
                ? 'Try adjusting your filters or search query'
                : 'Start capturing knowledge by importing from Kindle, saving web articles, or adding highlights manually.'}
            </p>
            {!params.query && !params.sourceType && !params.tagIds && (
              <Button asChild>
                <Link href="/highlights/import">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Highlight
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <HighlightsClient highlights={highlights} />
      )}
    </div>
  )
}
