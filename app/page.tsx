"use client"

import * as React from "react"
import Link from "next/link"
import { Gamepad2, BookOpen, TrendingUp, Clock, Tv, Film } from "lucide-react"
import { getGamesAction } from "@/app/actions/games"
import { getBooksAction } from "@/app/actions/books"
import { getTVShowsAction } from "@/app/actions/tvshows"
import { getMoviesAction } from "@/app/actions/movies"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell, Legend } from "recharts"

export default function Dashboard() {
  const [games, setGames] = React.useState<any[]>([])
  const [books, setBooks] = React.useState<any[]>([])
  const [tvshows, setTVShows] = React.useState<any[]>([])
  const [movies, setMovies] = React.useState<any[]>([])

  React.useEffect(() => {
    const loadData = async () => {
      const [gamesData, booksData, tvshowsData, moviesData] = await Promise.all([
        getGamesAction(),
        getBooksAction(),
        getTVShowsAction(),
        getMoviesAction()
      ])
      setGames(gamesData)
      setBooks(booksData)
      setTVShows(tvshowsData)
      setMovies(moviesData)
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

  const gameStatusData = [
    { status: 'Playing', count: games.filter(g => g.status === 'Playing').length, color: '#3b82f6' },
    { status: 'Completed', count: games.filter(g => g.status === 'Completed').length, color: '#10b981' },
    { status: 'Stopped', count: games.filter(g => g.status === 'Stopped').length, color: '#ef4444' },
  ].filter(item => item.count > 0)

  const bookTypeData = [
    { type: 'Ebooks', count: books.filter(b => b.type === 'Ebook').length, color: '#a855f7' },
    { type: 'Audiobooks', count: books.filter(b => b.type === 'Audiobook').length, color: '#f97316' },
  ].filter(item => item.count > 0)

  const recentGames = games
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentBooks = books
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentTVShows = tvshows
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your tracking hub</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gamesCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalGameHours.toFixed(1)} hours played
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{booksCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalBookPages.toLocaleString()} pages read
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gaming Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGameHours.toFixed(0)}h</div>
            <p className="text-xs text-muted-foreground">
              Across {totalGameDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reading Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(totalBookMinutes / 60)}h {totalBookMinutes % 60}m
            </div>
            <p className="text-xs text-muted-foreground">
              Audio time listened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TV Shows</CardTitle>
            <Tv className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tvshowsCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalTVEpisodes} episodes watched
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movies</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moviesCount}</div>
            <p className="text-xs text-muted-foreground">
              {Math.floor(totalMovieRuntime / 60)}h {totalMovieRuntime % 60}m watched
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Games by Status</CardTitle>
            <CardDescription>Distribution of your game collection</CardDescription>
          </CardHeader>
          <CardContent>
            {gameStatusData.length > 0 ? (
              <ChartContainer
                config={{
                  count: {
                    label: "Games",
                  },
                }}
                className="h-[300px]"
              >
                <PieChart>
                  <Pie
                    data={gameStatusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {gameStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No games data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Books by Type</CardTitle>
            <CardDescription>Ebooks vs Audiobooks</CardDescription>
          </CardHeader>
          <CardContent>
            {bookTypeData.length > 0 ? (
              <ChartContainer
                config={{
                  count: {
                    label: "Books",
                  },
                }}
                className="h-[300px]"
              >
                <PieChart>
                  <Pie
                    data={bookTypeData}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {bookTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No books data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
      </div>
    </div>
  )
}
