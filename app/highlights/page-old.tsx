import { getHighlightsAction, getSourcesAction, getHighlightsCountAction } from '@/app/actions/highlights'
import { getReviewStatsAction } from '@/app/actions/reviews'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookMarked, FileText, Globe, Plus, Search, Sparkles, Brain, Cloud, Download } from 'lucide-react'
import { ReviewStatsCard } from '@/components/review-stats-card'
import { HighlightsClient } from './highlights-client'
import Link from 'next/link'

export default async function HighlightsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; type?: string }>
}) {
  const params = await searchParams
  const highlights = await getHighlightsAction({
    query: params.query,
    sourceType: params.type as any,
    limit: 50,
  })

  const sources = await getSourcesAction({ limit: 10 })
  const totalCount = await getHighlightsCountAction()
  const reviewStats = await getReviewStatsAction()

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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                name="query"
                placeholder="Search highlights..."
                className="pl-9"
                defaultValue={params.query}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Highlights</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {highlights.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No highlights yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Start capturing knowledge by importing from Kindle, saving web articles, or adding highlights manually.
                </p>
                <Button asChild>
                  <Link href="/highlights/import">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Highlight
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <HighlightsClient highlights={highlights} />
          )}
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Recent highlights will appear here
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Favorited highlights will appear here
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
