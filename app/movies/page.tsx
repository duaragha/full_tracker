"use client"

import * as React from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, Star, Calendar, Clock } from "lucide-react"
import { Movie, MovieSearchResult } from "@/types/movie"
import { getMoviesAction, addMovieAction, updateMovieAction, deleteMovieAction } from "@/app/actions/movies"
import { getMovieDetailAction } from "@/app/actions/movies-paginated"
import { MovieSearch } from "@/components/movie-search"
import { MovieEntryForm } from "@/components/movie-entry-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { GridView, GridViewItem } from "@/components/ui/grid-view"
import { ViewToggle, useViewMode } from "@/components/ui/view-toggle"
import { MediaDetailModal } from "@/components/ui/media-detail-modal"
import { CollapsibleSection } from "@/components/ui/collapsible-section"

type MovieSortField = "title" | "runtime" | "rating" | "dateWatched" | "releaseDate"
type SortDirection = "asc" | "desc"
type MovieStatusFilter = "All" | Movie["status"]

export default function MoviesPage() {
  const [movies, setMovies] = React.useState<Movie[]>([])
  const [selectedMovie, setSelectedMovie] = React.useState<MovieSearchResult | null>(null)
  const [editingMovie, setEditingMovie] = React.useState<Movie | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<MovieStatusFilter>("All")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<MovieSortField>("title")
  const [sortOrder, setSortOrder] = React.useState<SortDirection>("asc")

  // Grid view state
  const [viewMode, setViewMode] = useViewMode("table", "movies-view-mode")
  const [detailModalOpen, setDetailModalOpen] = React.useState(false)
  const [detailMovie, setDetailMovie] = React.useState<Movie | null>(null)

  React.useEffect(() => {
    const loadMovies = async () => {
      const data = await getMoviesAction()
      setMovies(data)
    }
    loadMovies()
  }, [])

  const handleMovieSelect = (movie: MovieSearchResult) => {
    setSelectedMovie(movie)
    setEditingMovie(null)
    setShowForm(true)
  }

  const handleSubmit = async (movieData: Omit<Movie, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingMovie) {
      await updateMovieAction(Number(editingMovie.id), movieData)
    } else {
      await addMovieAction(movieData)
    }
    const data = await getMoviesAction()
    setMovies(data)
    setShowForm(false)
    setSelectedMovie(null)
    setEditingMovie(null)
  }

  const handleEdit = (movie: Movie) => {
    setEditingMovie(movie)
    setSelectedMovie(null)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this movie?")) {
      await deleteMovieAction(Number(id))
      const data = await getMoviesAction()
      setMovies(data)
    }
  }

  // Handle grid item click - load full details and show modal
  const handleGridItemClick = async (item: GridViewItem) => {
    setDetailModalOpen(true)
    try {
      const movie = await getMovieDetailAction(item.id)
      setDetailMovie(movie)
    } catch (error) {
      console.error("Failed to load movie details:", error)
      // Fallback to using existing movie data
      const movie = movies.find(m => m.id === item.id)
      setDetailMovie(movie || null)
    }
  }

  // Close detail modal and reset state
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false)
    setDetailMovie(null)
  }

  const filteredAndSortedMovies = React.useMemo(() => {
    // Apply status filter
    let filtered = statusFilter === "All"
      ? movies
      : movies.filter(m => m.status === statusFilter)

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "runtime":
          comparison = a.runtime - b.runtime
          break
        case "rating":
          comparison = (a.rating || 0) - (b.rating || 0)
          break
        case "dateWatched":
          const dateA = a.dateWatched ? new Date(a.dateWatched).getTime() : 0
          const dateB = b.dateWatched ? new Date(b.dateWatched).getTime() : 0
          comparison = dateA - dateB
          break
        case "releaseDate":
          const relA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0
          const relB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0
          comparison = relA - relB
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return sorted
  }, [movies, statusFilter, searchQuery, sortBy, sortOrder])

  const groupedMovies = React.useMemo(() => {
    const groups: Record<"watched" | "watchlist" | "stopped", Movie[]> = {
      watched: [],
      watchlist: [],
      stopped: [],
    }

    filteredAndSortedMovies.forEach((movie) => {
      if (movie.status === "Watched") {
        groups.watched.push(movie)
      } else if (movie.status === "Watchlist") {
        groups.watchlist.push(movie)
      } else {
        groups.stopped.push(movie)
      }
    })

    return groups
  }, [filteredAndSortedMovies])

  const getStatusBadgeVariant = (status: Movie['status']): GridViewItem['badgeVariant'] => {
    switch (status) {
      case 'Watched':
        return 'secondary'
      case 'Watchlist':
        return 'default'
      default:
        return 'default'
    }
  }

  // Convert movies to grid items
  const buildGridItem = (movie: Movie): GridViewItem => {
    const hours = Math.floor(movie.runtime / 60)
    const mins = movie.runtime % 60
    const runtimeText = `${hours > 0 ? `${hours}h ` : ''}${mins}m`

    return {
      id: movie.id,
      title: movie.title,
      imageUrl: movie.posterImage || '/placeholder-image.png',
      subtitle: movie.director || (movie.releaseYear ? `${movie.releaseYear}` : undefined),
      badge: movie.status,
      badgeVariant: getStatusBadgeVariant(movie.status),
      metadata: movie.rating ? [
        { label: "Rating", value: `${movie.rating}/10` },
        { label: "Runtime", value: runtimeText }
      ] : [
        { label: "Runtime", value: runtimeText }
      ]
    }
  }

  const gridItemsByStatus = React.useMemo(() => ({
    watched: groupedMovies.watched.map(buildGridItem),
    watchlist: groupedMovies.watchlist.map(buildGridItem),
    stopped: groupedMovies.stopped.map(buildGridItem),
  }), [groupedMovies])

  const statusSections = [
    { key: 'watched', title: 'Watched' },
    { key: 'watchlist', title: 'Watchlist' },
    { key: 'stopped', title: 'Stopped' },
  ] as const

  const totalMovies = movies.length
  const totalRuntime = movies.reduce((total, movie) => total + (movie.runtime || 0), 0)
  const rated = movies.filter(m => m.rating)
  const avgRating = rated.length > 0 ? Math.round((rated.reduce((total, movie) => total + (movie.rating || 0), 0) / rated.length) * 10) : 0
  const moviesThisYear = movies.filter(m => {
    const watchedDate = m.dateWatched ? new Date(m.dateWatched) : null
    return watchedDate && watchedDate.getFullYear() === new Date().getFullYear()
  }).length
  const totalHours = Math.floor(totalRuntime / 60)
  const totalMinutes = totalRuntime % 60

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Movies Tracker</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your movie watching journey</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Movie Manually
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">{totalMovies}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total Movies</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">{totalHours}h {totalMinutes}m</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total Runtime</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">{avgRating}/10</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Average Rating</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">{moviesThisYear}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Movies This Year</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl">Search for a Movie</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Find movies from The Movie Database</CardDescription>
        </CardHeader>
        <CardContent>
          <MovieSearch onSelectMovie={handleMovieSelect} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-xl sm:text-2xl">Your Movies</CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <ViewToggle
                  value={viewMode}
                  onValueChange={setViewMode}
                  storageKey="movies-view-mode"
                />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MovieStatusFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Movies</SelectItem>
                    <SelectItem value="Watched">Watched</SelectItem>
                    <SelectItem value="Watchlist">Watchlist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Input
                placeholder="Search movies by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as MovieSortField)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="runtime">Runtime</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="dateWatched">Date Watched</SelectItem>
                  <SelectItem value="releaseDate">Release Date</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortDirection)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedMovies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No movies found. Start adding movies to track your progress!
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-8">
              {statusSections.map(({ key, title }) => {
                const items = gridItemsByStatus[key]
                if (items.length === 0) return null

                return (
                  <CollapsibleSection
                    key={key}
                    title={title}
                    count={items.length}
                    defaultOpen={true}
                    storageKey={`movies-section-${key}`}
                  >
                    <GridView
                      items={items}
                      onItemClick={handleGridItemClick}
                      aspectRatio="portrait"
                      emptyMessage={`No ${title.toLowerCase()} movies`}
                      emptyActionLabel="Add Movie"
                      onEmptyAction={() => setShowForm(true)}
                    />
                  </CollapsibleSection>
                )
              })}
            </div>
          ) : (
            <div className="space-y-8">
              {statusSections.map(({ key, title }) => {
                const movies = groupedMovies[key]
                if (movies.length === 0) return null

                return (
                  <CollapsibleSection
                    key={key}
                    title={title}
                    count={movies.length}
                    defaultOpen={true}
                    storageKey={`movies-section-${key}`}
                  >
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Poster</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Director</TableHead>
                            <TableHead>Genres</TableHead>
                            <TableHead>Runtime</TableHead>
                            <TableHead>Released</TableHead>
                            <TableHead>Watched</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movies.map((movie) => {
                      const hours = Math.floor(movie.runtime / 60)
                      const mins = movie.runtime % 60

                      return (
                        <TableRow key={movie.id}>
                        <TableCell>
                          {movie.posterImage && (
                            <Image
                              src={movie.posterImage}
                              alt={movie.title}
                              width={48}
                              height={64}
                              className="h-16 w-12 rounded object-cover"
                            />
                          )}
                        </TableCell>
                          <TableCell className="font-medium">{movie.title}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(movie.status)}>
                              {movie.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{movie.director}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {movie.genres.slice(0, 2).map((genre) => (
                                <Badge key={genre} variant="secondary" className="text-xs">
                                  {genre}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {hours > 0 && `${hours}h `}{mins}m
                          </TableCell>
                          <TableCell>
                            {movie.releaseDate
                              ? new Date(movie.releaseDate).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {movie.dateWatched
                              ? new Date(movie.dateWatched).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {movie.rating ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{movie.rating}/10</span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(movie)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(movie.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="grid md:hidden grid-cols-1 gap-4">
                      {movies.map((movie) => {
                  const hours = Math.floor(movie.runtime / 60)
                  const mins = movie.runtime % 60

                  return (
                    <Card key={movie.id} className="overflow-hidden">
                      <div className="flex gap-4 p-4">
                      {movie.posterImage && (
                        <Image
                          src={movie.posterImage}
                          alt={movie.title}
                          width={96}
                          height={128}
                          className="h-32 w-24 rounded object-cover flex-shrink-0"
                        />
                      )}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <h3 className="font-semibold text-base leading-tight line-clamp-2">
                              {movie.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {movie.director}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(movie.status)}>
                              {movie.status}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {movie.genres.slice(0, 3).map((genre) => (
                              <Badge key={genre} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div>
                              <span className="text-muted-foreground">Runtime:</span>
                              <span className="ml-1 font-medium">
                                {hours > 0 && `${hours}h `}{mins}m
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Released:</span>
                              <span className="ml-1 font-medium">
                                {movie.releaseDate
                                  ? new Date(movie.releaseDate).toLocaleDateString()
                                  : "N/A"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Watched:</span>
                              <span className="ml-1 font-medium">
                                {movie.dateWatched
                                  ? new Date(movie.dateWatched).toLocaleDateString()
                                  : "-"}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-muted-foreground">Rating:</span>
                              {movie.rating ? (
                                <div className="flex items-center gap-1 ml-1">
                                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">{movie.rating}/10</span>
                                </div>
                              ) : (
                                <span className="ml-1 font-medium">-</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(movie)}
                              className="flex-1"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(movie.id)}
                              className="flex-1"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                        )
                      })}
                    </div>
                  </CollapsibleSection>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movie Detail Modal */}
      <MediaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title={detailMovie?.title || "Loading..."}
        subtitle={detailMovie?.director}
        imageUrl={detailMovie?.posterImage || '/placeholder-image.png'}
        posterAspectRatio="portrait"
        badges={detailMovie ? [{ label: detailMovie.status, variant: getStatusBadgeVariant(detailMovie.status) }] : []}
        rating={detailMovie?.rating ? { value: detailMovie.rating, max: 10, label: "Your Rating" } : undefined}
        primaryFields={detailMovie ? [
          {
            label: "Runtime",
            value: `${Math.floor(detailMovie.runtime / 60)}h ${detailMovie.runtime % 60}m`,
            icon: <Clock className="h-4 w-4" />
          },
          {
            label: "Release Date",
            value: detailMovie.releaseDate ? new Date(detailMovie.releaseDate).toLocaleDateString() : "N/A",
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: "Release Year",
            value: detailMovie.releaseYear || "N/A",
          },
          {
            label: "Date Watched",
            value: detailMovie.dateWatched ? new Date(detailMovie.dateWatched).toLocaleDateString() : "Not watched yet",
            icon: <Calendar className="h-4 w-4" />
          },
        ] : []}
        secondaryFields={detailMovie ? [
          {
            label: "Genres",
            value: detailMovie.genres.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {detailMovie.genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            ) : "No genres",
            fullWidth: true
          },
          {
            label: "TMDb ID",
            value: detailMovie.tmdbId,
          },
          {
            label: "Added",
            value: new Date(detailMovie.createdAt).toLocaleDateString(),
          },
          {
            label: "Last Updated",
            value: new Date(detailMovie.updatedAt).toLocaleDateString(),
          },
        ] : []}
        notes={detailMovie?.notes}
        actions={detailMovie ? [
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              handleEdit(detailMovie)
              handleCloseDetailModal()
            },
            variant: "outline"
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: async () => {
              handleCloseDetailModal()
              await handleDelete(detailMovie.id)
            },
            variant: "destructive"
          }
        ] : []}
      />

      {/* Add/Edit Movie Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-3 sm:p-4 md:p-6 pb-3 sm:pb-4">
            <DialogTitle>
              {editingMovie ? "Edit Movie" : "Add New Movie"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
            <MovieEntryForm
              selectedMovie={selectedMovie}
              initialData={editingMovie || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false)
                setSelectedMovie(null)
                setEditingMovie(null)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
