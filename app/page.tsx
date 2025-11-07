"use client"

import * as React from "react"
import Link from "next/link"
import { Clock, Tv, Package, Briefcase, ChevronRight } from "lucide-react"
import { getGamesAction } from "@/app/actions/games"
import { getBooksAction } from "@/app/actions/books"
import { getTVShowsAction } from "@/app/actions/tvshows"
import { getMoviesAction } from "@/app/actions/movies"
import { getPHEVStatsAction, getPHEVCarSummariesAction } from "@/app/actions/phev"
import { getInventoryItemsAction } from "@/app/actions/inventory"
import { getJobStatsAction } from "@/app/actions/jobs"
import { getGameDetailAction } from "@/app/actions/games-paginated"
import { getBookDetailAction } from "@/app/actions/books-paginated"
import { getTVShowDetailAction } from "@/app/actions/tvshows-paginated"
import { getMovieDetailAction } from "@/app/actions/movies-paginated"
import { markEpisodeWatchedAction } from "@/app/actions/tvshows"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MediaDetailModal } from "@/components/ui/media-detail-modal"
import { NextEpisodesList } from "@/components/ui/next-episodes-list"
import { formatTimeBreakdown } from "@/lib/utils/time-format"

export default function Dashboard() {
  const [games, setGames] = React.useState<any[]>([])
  const [books, setBooks] = React.useState<any[]>([])
  const [tvshows, setTVShows] = React.useState<any[]>([])
  const [movies, setMovies] = React.useState<any[]>([])
  const [inventory, setInventory] = React.useState<any[]>([])
  const [phevStats, setPHEVStats] = React.useState<any>(null)
  const [phevCarSummaries, setPHEVCarSummaries] = React.useState<any[]>([])
  const [jobStats, setJobStats] = React.useState<any>(null)

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = React.useState(false)
  const [detailItem, setDetailItem] = React.useState<any>(null)
  const [detailType, setDetailType] = React.useState<'game' | 'book' | 'tvshow' | 'movie' | null>(null)

  React.useEffect(() => {
    const loadData = async () => {
      const [gamesData, booksData, tvshowsData, moviesData, inventoryData, phevStatsData, phevCarData, jobStatsData] = await Promise.all([
        getGamesAction(),
        getBooksAction(),
        getTVShowsAction(),
        getMoviesAction(),
        getInventoryItemsAction(),
        getPHEVStatsAction(),
        getPHEVCarSummariesAction(),
        getJobStatsAction()
      ])
      setGames(gamesData)
      setBooks(booksData)
      setTVShows(tvshowsData)
      setMovies(moviesData)
      setInventory(inventoryData)
      setPHEVStats(phevStatsData)
      setPHEVCarSummaries(phevCarData)
      setJobStats(jobStatsData)
    }
    loadData()
  }, [])

  const handleItemClick = async (id: string, type: 'game' | 'book' | 'tvshow' | 'movie') => {
    setDetailModalOpen(true)
    setDetailType(type)

    try {
      let detail
      switch (type) {
        case 'game':
          detail = await getGameDetailAction(id)
          break
        case 'book':
          detail = await getBookDetailAction(id)
          break
        case 'tvshow':
          detail = await getTVShowDetailAction(id)
          break
        case 'movie':
          detail = await getMovieDetailAction(id)
          break
      }
      setDetailItem(detail)
    } catch (error) {
      console.error(`Failed to load ${type} details:`, error)
      // Fallback to existing data
      const items = type === 'game' ? games : type === 'book' ? books : type === 'tvshow' ? tvshows : movies
      const item = items.find(i => i.id === id)
      setDetailItem(item || null)
    }
  }

  const handleEpisodeWatched = async (seasonNumber: number, episodeNumber: number) => {
    if (!detailItem?.id) return

    try {
      // Mark episode as watched
      const result = await markEpisodeWatchedAction(
        parseInt(detailItem.id),
        seasonNumber,
        episodeNumber,
        true,
        new Date().toISOString()
      )

      // Reload the TV show detail to get updated data
      const updatedDetail = await getTVShowDetailAction(detailItem.id)
      setDetailItem(updatedDetail)

      // Also refresh the tvshows list in the background
      const updatedTVShows = await getTVShowsAction()
      setTVShows(updatedTVShows)
    } catch (error) {
      console.error('Failed to mark episode as watched:', error)
      throw error // Re-throw so the NextEpisodesList can handle it
    }
  }

  const activeGames = games.filter(g => g.status !== 'Stopped')
  const activeBooks = books.filter(b => b.status !== 'Stopped')
  const activeTVShows = tvshows.filter(s => s.status !== 'Stopped')
  const activeMovies = movies.filter(m => m.status !== 'Stopped')
  const gamesCount = activeGames.length
  const booksCount = activeBooks.length
  const tvshowsCount = activeTVShows.length
  const moviesCount = activeMovies.length
  const totalGameHours = activeGames.reduce((sum, g) => sum + g.hoursPlayed + g.minutesPlayed / 60, 0)
  const totalGameDays = activeGames.reduce((sum, g) => sum + g.daysPlayed, 0)
  const totalBookPages = activeBooks.reduce((total, book) => total + (book.pages || 0), 0)
  const totalBookMinutes = activeBooks.reduce((total, book) => total + (book.hours * 60 + book.minutes || 0), 0)
  const totalBookDays = activeBooks.reduce((sum, b) => sum + b.daysRead, 0)
  const totalTVEpisodes = activeTVShows.reduce((total, show) => total + (show.watchedEpisodes || 0), 0)
  const totalTVMinutes = activeTVShows.reduce((total, show) => total + (show.totalMinutes || 0), 0)
  const totalTVDays = activeTVShows.reduce((total, show) => total + (show.daysTracking || 0), 0)
  const totalMovieRuntime = activeMovies.reduce((total, movie) => total + (movie.runtime || 0), 0)

  // Calculate current month PHEV stats
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
  let monthlyKm = 0
  let monthlyCost = 0

  if (phevCarSummaries && phevCarSummaries.length > 0) {
    phevCarSummaries.forEach(summary => {
      if (summary.monthlyGroups) {
        const currentMonthData = summary.monthlyGroups.find(group => group.month === currentMonth)
        if (currentMonthData) {
          monthlyKm += currentMonthData.totalKm
          monthlyCost += currentMonthData.totalCost
        }
      }
    })
  }

  // Get currently watching shows with next episode info
  const watchingShows = tvshows.filter(show => {
    const progress = show.totalEpisodes > 0 ? (show.watchedEpisodes / show.totalEpisodes) * 100 : 0
    return show.status === 'Watching' && progress > 0 && progress < 100
  }).slice(0, 4)

  const recentGames = games
    .filter(g => g.status !== 'Stopped')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentBooks = books
    .filter(b => b.status !== 'Stopped')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentTVShows = tvshows
    .filter(s => s.status !== 'Stopped')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentMovies = movies
    .filter(m => m.status !== 'Stopped')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentInventory = inventory
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome to your tracking hub</p>
      </div>

      <div className="w-full grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{gamesCount}</CardTitle>
            <CardDescription className="text-xs">Total Games</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{booksCount}</CardTitle>
            <CardDescription className="text-xs">Total Books</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{totalGameHours.toFixed(0)}h</CardTitle>
            <CardDescription className="text-xs">Gaming Time</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{Math.floor(totalBookMinutes / 60)}h {totalBookMinutes % 60}m</CardTitle>
            <CardDescription className="text-xs">Reading Time</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{tvshowsCount}</CardTitle>
            <CardDescription className="text-xs">TV Shows</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{moviesCount}</CardTitle>
            <CardDescription className="text-xs">Movies</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{monthlyKm.toFixed(0)} km</CardTitle>
            <CardDescription className="text-xs">This Month KMs</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">${monthlyCost.toFixed(2)}</CardTitle>
            <CardDescription className="text-xs">This Month Cost</CardDescription>
          </CardHeader>
        </Card>

        <Link href="/jobs" className="block">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="w-4 h-4" />
                {jobStats?.totalJobs || 0}
              </CardTitle>
              <CardDescription className="text-xs">Job Applications</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Currently Watching Episodes Section */}
      {watchingShows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tv className="w-5 h-5" />
                  Currently Watching
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Continue where you left off</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/tvshows">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
              {watchingShows.map((show) => {
                const progress = show.totalEpisodes > 0 ? Math.round((show.watchedEpisodes / show.totalEpisodes) * 100) : 0

                // Find the next unwatched episode
                let nextEpisodeInfo = null
                if (show.seasons && show.seasons.length > 0) {
                  for (const season of show.seasons) {
                    for (const episode of season.episodes || []) {
                      if (!episode.watched) {
                        nextEpisodeInfo = {
                          number: episode.episodeNumber,
                          name: episode.name,
                          seasonNumber: season.seasonNumber
                        }
                        break
                      }
                    }
                    if (nextEpisodeInfo) break
                  }
                }

                return (
                  <div
                    key={show.id}
                    onClick={() => handleItemClick(show.id, 'tvshow')}
                    className="group cursor-pointer border rounded-md overflow-hidden hover:shadow-md transition-all hover:border-primary/50"
                  >
                    <div className="flex gap-1.5 p-2">
                      {show.posterImage && (
                        <img
                          src={show.posterImage}
                          alt={show.title}
                          className="h-14 w-10 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="font-semibold text-xs line-clamp-2 group-hover:text-primary transition-colors">
                            {show.title}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                            {nextEpisodeInfo
                              ? `Next: Episode ${nextEpisodeInfo.number}${nextEpisodeInfo.name ? ` - ${nextEpisodeInfo.name.length > 20 ? nextEpisodeInfo.name.substring(0, 20) + '...' : nextEpisodeInfo.name}` : ''}`
                              : `Next: Episode ${show.watchedEpisodes + 1}`
                            }
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">{show.watchedEpisodes}/{show.totalEpisodes}</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1">
                            <div
                              className="bg-primary h-1 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg">Recent Games</CardTitle>
                <CardDescription className="text-xs">Recently updated</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 text-xs h-8">
                <Link href="/games">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentGames.length > 0 ? (
              <div className="space-y-2">
                {recentGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => handleItemClick(game.id, 'game')}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors"
                  >
                    {game.coverImage && (
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="h-12 w-12 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{game.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {game.status} • {game.percentage}% • {game.hoursPlayed}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No games yet. Start tracking!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg">Recent Books</CardTitle>
                <CardDescription className="text-xs">Recently updated</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 text-xs h-8">
                <Link href="/books">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentBooks.length > 0 ? (
              <div className="space-y-2">
                {recentBooks.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => handleItemClick(book.id, 'book')}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors"
                  >
                    {book.coverImage && (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="h-12 w-9 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{book.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {book.author} • {book.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No books yet. Start reading!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg">Recent TV Shows</CardTitle>
                <CardDescription className="text-xs">Recently updated</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 text-xs h-8">
                <Link href="/tvshows">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTVShows.length > 0 ? (
              <div className="space-y-2">
                {recentTVShows.map((show) => (
                  <div
                    key={show.id}
                    onClick={() => handleItemClick(show.id, 'tvshow')}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors"
                  >
                    {show.posterImage && (
                      <img
                        src={show.posterImage}
                        alt={show.title}
                        className="h-12 w-9 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{show.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {show.watchedEpisodes}/{show.totalEpisodes} episodes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No TV shows yet. Start watching!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg">Recent Movies</CardTitle>
                <CardDescription className="text-xs">Recently updated</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 text-xs h-8">
                <Link href="/movies">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentMovies.length > 0 ? (
              <div className="space-y-2">
                {recentMovies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => handleItemClick(movie.id, 'movie')}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors"
                  >
                    {movie.posterImage && (
                      <img
                        src={movie.posterImage}
                        alt={movie.title}
                        className="h-12 w-9 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{movie.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {movie.status} • {movie.releaseYear || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No movies yet. Start watching!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg">Recent Inventory</CardTitle>
                <CardDescription className="text-xs">Recently added</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 text-xs h-8">
                <Link href="/inventory">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentInventory.length > 0 ? (
              <div className="space-y-2">
                {recentInventory.map((item) => (
                  <Link
                    key={item.id}
                    href="/inventory"
                    className="flex items-center gap-2 hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors block"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Qty: {item.quantity} • ${item.purchasePrice?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No inventory items yet. Start tracking!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Media Detail Modal - Generic for all types */}
      <MediaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title={detailItem?.title || "Loading..."}
        subtitle={
          detailType === 'game' ? (detailItem?.developer || detailItem?.publisher) :
          detailType === 'book' ? detailItem?.author :
          detailType === 'tvshow' ? (detailItem?.network || detailItem?.creators?.[0]) :
          detailType === 'movie' ? (detailItem?.director || detailItem?.releaseYear?.toString()) :
          undefined
        }
        imageUrl={
          detailType === 'game' ? (detailItem?.coverImage || '/placeholder-image.png') :
          (detailItem?.posterImage || detailItem?.coverImage || '/placeholder-image.png')
        }
        posterAspectRatio={detailType === 'game' ? 'square' : 'portrait'}
        badges={detailItem ? [
          {
            label: detailItem.status || 'Unknown',
            variant: 'default'
          },
        ] : []}
        primaryFields={detailItem && detailType ? (
          detailType === 'game' ? [
            { label: "Progress", value: `${detailItem.percentage}%` },
            { label: "Hours Played", value: `${detailItem.hoursPlayed}h ${detailItem.minutesPlayed}m`, icon: <Clock className="h-4 w-4" /> },
            { label: "Days Played", value: detailItem.daysPlayed.toString() },
          ] :
          detailType === 'book' ? [
            { label: "Pages", value: detailItem.pages?.toString() || 'N/A' },
            { label: "Time", value: `${detailItem.hours}h ${detailItem.minutes}m`, icon: <Clock className="h-4 w-4" /> },
            { label: "Days Read", value: detailItem.daysRead.toString() },
          ] :
          detailType === 'tvshow' ? [
            { label: "Episodes", value: `${detailItem.watchedEpisodes}/${detailItem.totalEpisodes}`, icon: <Tv className="h-4 w-4" /> },
            { label: "Time", value: formatTimeBreakdown(detailItem.totalMinutes), icon: <Clock className="h-4 w-4" /> },
            { label: "Days Tracking", value: detailItem.daysTracking.toString() },
          ] :
          detailType === 'movie' ? [
            { label: "Runtime", value: `${detailItem.runtime} min`, icon: <Clock className="h-4 w-4" /> },
            { label: "Release Year", value: detailItem.releaseYear?.toString() || 'N/A' },
          ] : []
        ) : []}
        notes={detailItem?.notes}
        actions={[
          {
            label: "View Details",
            icon: <ChevronRight className="h-4 w-4" />,
            onClick: () => {
              setDetailModalOpen(false)
              const path = detailType === 'game' ? '/games' :
                          detailType === 'book' ? '/books' :
                          detailType === 'tvshow' ? '/tvshows' :
                          detailType === 'movie' ? '/movies' : '/'
              window.location.href = path
            },
            variant: "default"
          }
        ]}
      >
        {/* Show next episodes list for TV shows */}
        {detailType === 'tvshow' && detailItem?.seasons && (
          <NextEpisodesList
            showId={detailItem.id}
            seasons={detailItem.seasons}
            onEpisodeWatched={handleEpisodeWatched}
            maxEpisodes={4}
          />
        )}
      </MediaDetailModal>
    </div>
  )
}
