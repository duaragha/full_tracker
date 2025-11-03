"use client"

import * as React from "react"
import {
  Gamepad2,
  Book,
  Tv,
  Film,
  Car,
  Package,
  Briefcase,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react"
import { getStatsAction, getActivityTimelineAction, TimePeriod } from "@/app/actions/stats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PeriodSelector } from "@/components/stats/period-selector"
import { StatCard } from "@/components/stats/stat-card"
import { TimeInvestmentChart } from "@/components/stats/time-investment-chart"
import { CategoryBreakdown } from "@/components/stats/category-breakdown"

export default function StatisticsPage() {
  const [period, setPeriod] = React.useState<TimePeriod>("month")
  const [stats, setStats] = React.useState<any>(null)
  const [timeline, setTimeline] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        const [statsData, timelineData] = await Promise.all([
          getStatsAction(period),
          getActivityTimelineAction(6),
        ])
        setStats(statsData)
        setTimeline(timelineData)
      } catch (error) {
        console.error("Error fetching statistics:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [period])

  if (loading || !stats) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Prepare chart data
  const timeInvestmentData = [
    {
      category: "Games",
      hours: stats.timeInvestment.games,
      color: "#8B5CF6",
    },
    {
      category: "Books",
      hours: stats.timeInvestment.books,
      color: "#F59E0B",
    },
    {
      category: "TV Shows",
      hours: stats.timeInvestment.tvShows,
      color: "#3B82F6",
    },
    {
      category: "Movies",
      hours: stats.timeInvestment.movies,
      color: "#EF4444",
    },
  ].filter((item) => item.hours > 0)

  // Prepare category breakdown data
  const total = stats.timeInvestment.total
  const categoryBreakdownData = timeInvestmentData.map((item) => ({
    label: item.category,
    value: item.hours,
    percentage: total > 0 ? Math.round((item.hours / total) * 100) : 0,
    color: item.color,
  }))

  // Calculate completion rates
  const gamesCompletionRate = stats.games.total > 0
    ? Math.round((stats.games.completed / stats.games.total) * 100)
    : 0
  const booksCompletionRate = stats.books.total > 0
    ? Math.round((stats.books.completed / stats.books.total) * 100)
    : 0
  const tvCompletionRate = stats.tvShows.total > 0
    ? Math.round((stats.tvShows.completed / stats.tvShows.total) * 100)
    : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your tracking insights and progress
          </p>
        </div>
        <PeriodSelector selected={period} onChange={setPeriod} />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <StatCard
          label="Total Items"
          value={stats.quickStats.totalItems}
          icon={Activity}
        />
        <StatCard
          label="Total Hours"
          value={`${stats.quickStats.totalHours.toFixed(1)}h`}
          icon={Clock}
        />
        <StatCard
          label="Active Categories"
          value={stats.quickStats.activeCategories}
          icon={TrendingUp}
        />
        <StatCard
          label="Games"
          value={stats.games.total}
          icon={Gamepad2}
        />
        <StatCard
          label="Books"
          value={stats.books.total}
          icon={Book}
        />
        <StatCard
          label="TV Shows"
          value={stats.tvShows.total}
          icon={Tv}
        />
      </div>

      {/* Time Investment Overview */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        <TimeInvestmentChart data={timeInvestmentData} />
        <CategoryBreakdown data={categoryBreakdownData} />
      </div>

      {/* Category Deep Dive Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Category Details</CardTitle>
          <CardDescription className="text-xs">Detailed statistics by category</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="games" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="games" className="flex items-center gap-1.5">
                <Gamepad2 className="h-4 w-4" />
                <span className="hidden sm:inline">Games</span>
              </TabsTrigger>
              <TabsTrigger value="books" className="flex items-center gap-1.5">
                <Book className="h-4 w-4" />
                <span className="hidden sm:inline">Books</span>
              </TabsTrigger>
              <TabsTrigger value="tv" className="flex items-center gap-1.5">
                <Tv className="h-4 w-4" />
                <span className="hidden sm:inline">TV</span>
              </TabsTrigger>
              <TabsTrigger value="movies" className="flex items-center gap-1.5">
                <Film className="h-4 w-4" />
                <span className="hidden sm:inline">Movies</span>
              </TabsTrigger>
              <TabsTrigger value="phev" className="flex items-center gap-1.5">
                <Car className="h-4 w-4" />
                <span className="hidden sm:inline">PHEV</span>
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Inventory</span>
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Jobs</span>
              </TabsTrigger>
            </TabsList>

            {/* Games Tab */}
            <TabsContent value="games" className="space-y-4 mt-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.games.total}</CardTitle>
                    <CardDescription className="text-xs">Total Games</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.games.totalHours.toFixed(1)}h</CardTitle>
                    <CardDescription className="text-xs">Total Hours</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{gamesCompletionRate}%</CardTitle>
                    <CardDescription className="text-xs">Completion Rate</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.games.avgCompletion.toFixed(0)}%</CardTitle>
                    <CardDescription className="text-xs">Avg Progress</CardDescription>
                  </CardHeader>
                </Card>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.games.playing}</CardTitle>
                    <CardDescription className="text-xs">Currently Playing</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">${stats.games.totalCost.toFixed(2)}</CardTitle>
                    <CardDescription className="text-xs">Total Investment</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* Books Tab */}
            <TabsContent value="books" className="space-y-4 mt-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.books.total}</CardTitle>
                    <CardDescription className="text-xs">Total Books</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.books.totalHours.toFixed(1)}h</CardTitle>
                    <CardDescription className="text-xs">Total Hours</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{booksCompletionRate}%</CardTitle>
                    <CardDescription className="text-xs">Completion Rate</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.books.totalPages.toLocaleString()}</CardTitle>
                    <CardDescription className="text-xs">Total Pages</CardDescription>
                  </CardHeader>
                </Card>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.books.reading}</CardTitle>
                    <CardDescription className="text-xs">Currently Reading</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.books.completed}</CardTitle>
                    <CardDescription className="text-xs">Completed</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* TV Shows Tab */}
            <TabsContent value="tv" className="space-y-4 mt-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.tvShows.total}</CardTitle>
                    <CardDescription className="text-xs">Total Shows</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.tvShows.totalHours.toFixed(1)}h</CardTitle>
                    <CardDescription className="text-xs">Total Hours</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{tvCompletionRate}%</CardTitle>
                    <CardDescription className="text-xs">Completion Rate</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.tvShows.totalEpisodes}</CardTitle>
                    <CardDescription className="text-xs">Episodes Watched</CardDescription>
                  </CardHeader>
                </Card>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.tvShows.watching}</CardTitle>
                    <CardDescription className="text-xs">Currently Watching</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.tvShows.completed}</CardTitle>
                    <CardDescription className="text-xs">Completed</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* Movies Tab */}
            <TabsContent value="movies" className="space-y-4 mt-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.movies.total}</CardTitle>
                    <CardDescription className="text-xs">Total Movies</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.movies.totalHours.toFixed(1)}h</CardTitle>
                    <CardDescription className="text-xs">Total Hours</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.movies.watched}</CardTitle>
                    <CardDescription className="text-xs">Watched</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.movies.totalRuntime} min</CardTitle>
                    <CardDescription className="text-xs">Total Runtime</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* PHEV Tab */}
            <TabsContent value="phev" className="space-y-4 mt-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.phev.totalKm.toFixed(0)} km</CardTitle>
                    <CardDescription className="text-xs">Total Distance</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">${stats.phev.totalCost.toFixed(2)}</CardTitle>
                    <CardDescription className="text-xs">Total Cost</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.phev.entries}</CardTitle>
                    <CardDescription className="text-xs">Entries</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.phev.avgKmPerEntry.toFixed(0)} km</CardTitle>
                    <CardDescription className="text-xs">Avg per Entry</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4 mt-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.inventory.total}</CardTitle>
                    <CardDescription className="text-xs">Total Items</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">${stats.inventory.totalValue.toFixed(2)}</CardTitle>
                    <CardDescription className="text-xs">Total Value</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.inventory.totalQuantity}</CardTitle>
                    <CardDescription className="text-xs">Total Quantity</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* Jobs Tab */}
            <TabsContent value="jobs" className="space-y-4 mt-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.jobs.total}</CardTitle>
                    <CardDescription className="text-xs">Total Applications</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.jobs.applied}</CardTitle>
                    <CardDescription className="text-xs">Applied</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.jobs.interview}</CardTitle>
                    <CardDescription className="text-xs">Interviews</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">{stats.jobs.offer}</CardTitle>
                    <CardDescription className="text-xs">Offers</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
