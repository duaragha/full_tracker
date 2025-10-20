"use client"

import * as React from "react"
import Link from "next/link"
import { Gamepad2, BookOpen, TrendingUp, Clock, Tv, Film, Car, DollarSign, Package } from "lucide-react"
import { getGamesAction } from "@/app/actions/games"
import { getBooksAction } from "@/app/actions/books"
import { getTVShowsAction } from "@/app/actions/tvshows"
import { getMoviesAction } from "@/app/actions/movies"
import { getPHEVStatsAction, getPHEVCarSummariesAction } from "@/app/actions/phev"
import { getInventoryItemsAction } from "@/app/actions/inventory"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const [games, setGames] = React.useState<any[]>([])
  const [books, setBooks] = React.useState<any[]>([])
  const [tvshows, setTVShows] = React.useState<any[]>([])
  const [movies, setMovies] = React.useState<any[]>([])
  const [inventory, setInventory] = React.useState<any[]>([])
  const [phevStats, setPHEVStats] = React.useState<any>(null)
  const [phevCarSummaries, setPHEVCarSummaries] = React.useState<any[]>([])

  React.useEffect(() => {
    const loadData = async () => {
      const [gamesData, booksData, tvshowsData, moviesData, inventoryData, phevStatsData, phevCarData] = await Promise.all([
        getGamesAction(),
        getBooksAction(),
        getTVShowsAction(),
        getMoviesAction(),
        getInventoryItemsAction(),
        getPHEVStatsAction(),
        getPHEVCarSummariesAction()
      ])
      setGames(gamesData)
      setBooks(booksData)
      setTVShows(tvshowsData)
      setMovies(moviesData)
      setInventory(inventoryData)
      setPHEVStats(phevStatsData)
      setPHEVCarSummaries(phevCarData)
    }
    loadData()
  }, [])

  const activeGames = games.filter(g => g.status !== 'Stopped')
  const gamesCount = games.length
  const booksCount = books.length
  const tvshowsCount = tvshows.length
  const moviesCount = movies.length
  const totalGameHours = activeGames.reduce((sum, g) => sum + g.hoursPlayed + g.minutesPlayed / 60, 0)
  const totalGameDays = activeGames.reduce((sum, g) => sum + g.daysPlayed, 0)
  const totalBookPages = books.reduce((total, book) => total + (book.pages || 0), 0)
  const totalBookMinutes = books.reduce((total, book) => total + (book.hours * 60 + book.minutes || 0), 0)
  const totalBookDays = books.reduce((sum, b) => sum + b.daysRead, 0)
  const totalTVEpisodes = tvshows.reduce((total, show) => total + (show.watchedEpisodes || 0), 0)
  const totalTVMinutes = tvshows.reduce((total, show) => total + (show.totalMinutes || 0), 0)
  const totalTVDays = tvshows.reduce((total, show) => total + (show.daysTracking || 0), 0)
  const totalMovieRuntime = movies.reduce((total, movie) => total + (movie.runtime || 0), 0)

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

  const recentGames = games
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentBooks = books
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentTVShows = tvshows
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentMovies = movies
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentInventory = inventory
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your tracking hub</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-8">
        <Card>
          <CardHeader>
            <CardTitle>{gamesCount}</CardTitle>
            <CardDescription>Total Games</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{booksCount}</CardTitle>
            <CardDescription>Total Books</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{totalGameHours.toFixed(0)}h</CardTitle>
            <CardDescription>Gaming Time</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{Math.floor(totalBookMinutes / 60)}h {totalBookMinutes % 60}m</CardTitle>
            <CardDescription>Reading Time</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tvshowsCount}</CardTitle>
            <CardDescription>TV Shows</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{moviesCount}</CardTitle>
            <CardDescription>Movies</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{monthlyKm.toFixed(0)} km</CardTitle>
            <CardDescription>This Month KMs</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>${monthlyCost.toFixed(2)}</CardTitle>
            <CardDescription>This Month Cost</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Games</CardTitle>
                <CardDescription>Recently updated games</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/games">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentGames.length > 0 ? (
              <div className="space-y-4">
                {recentGames.map((game) => (
                  <div key={game.id} className="flex items-center gap-4">
                    {game.coverImage && (
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="h-16 w-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{game.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {game.status} • {game.percentage}% • {game.hoursPlayed}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No games yet. Start tracking!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Books</CardTitle>
                <CardDescription>Recently updated books</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/books">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentBooks.length > 0 ? (
              <div className="space-y-4">
                {recentBooks.map((book) => (
                  <div key={book.id} className="flex items-center gap-4">
                    {book.coverImage && (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="h-16 w-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{book.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {book.author} • {book.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No books yet. Start reading!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent TV Shows</CardTitle>
                <CardDescription>Recently updated shows</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/tvshows">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTVShows.length > 0 ? (
              <div className="space-y-4">
                {recentTVShows.map((show) => (
                  <div key={show.id} className="flex items-center gap-4">
                    {show.posterImage && (
                      <img
                        src={show.posterImage}
                        alt={show.title}
                        className="h-16 w-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{show.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {show.watchedEpisodes}/{show.totalEpisodes} episodes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No TV shows yet. Start watching!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Movies</CardTitle>
                <CardDescription>Recently updated movies</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/movies">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentMovies.length > 0 ? (
              <div className="space-y-4">
                {recentMovies.map((movie) => (
                  <div key={movie.id} className="flex items-center gap-4">
                    {movie.posterImage && (
                      <img
                        src={movie.posterImage}
                        alt={movie.title}
                        className="h-16 w-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{movie.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {movie.status} • {movie.releaseYear || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No movies yet. Start watching!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Inventory</CardTitle>
                <CardDescription>Recently added items</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/inventory">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentInventory.length > 0 ? (
              <div className="space-y-4">
                {recentInventory.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} • ${item.purchasePrice?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No inventory items yet. Start tracking!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
