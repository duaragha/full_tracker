"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, Star } from "lucide-react"
import { Movie, MovieSearchResult } from "@/types/movie"
import {
  getMovies,
  addMovie,
  updateMovie,
  deleteMovie,
  calculateTotalRuntime,
  calculateAverageRating,
} from "@/lib/db/movies-store"
import { MovieSearch } from "@/components/movie-search"
import { MovieEntryForm } from "@/components/movie-entry-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function MoviesPage() {
  const [movies, setMovies] = React.useState<Movie[]>([])
  const [selectedMovie, setSelectedMovie] = React.useState<MovieSearchResult | null>(null)
  const [editingMovie, setEditingMovie] = React.useState<Movie | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"title" | "runtime" | "rating" | "dateWatched" | "releaseDate">("title")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  React.useEffect(() => {
    const loadMovies = async () => {
      const data = await getMovies()
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
      await updateMovie(Number(editingMovie.id), movieData)
    } else {
      await addMovie(movieData)
    }
    const data = await getMovies()
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
      await deleteMovie(Number(id))
      const data = await getMovies()
      setMovies(data)
    }
  }

  const filteredAndSortedMovies = React.useMemo(() => {
    let filtered = movies

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
          comparison = a.rating - b.rating
          break
        case "dateWatched":
          const dateA = a.dateWatched ? new Date(a.dateWatched).getTime() : 0
          const dateB = b.dateWatched ? new Date(b.dateWatched).getTime() : 0
          comparison = dateA - dateB
          break
        case "releaseDate":
          const relA = new Date(a.releaseDate).getTime()
          const relB = new Date(b.releaseDate).getTime()
          comparison = relA - relB
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return sorted
  }, [movies, searchQuery, sortBy, sortOrder])

  const totalMovies = movies.length
  const totalRuntime = calculateTotalRuntime(movies)
  const avgRating = calculateAverageRating(movies)
  const moviesThisYear = movies.filter(m => {
    const watchedDate = m.dateWatched ? new Date(m.dateWatched) : null
    return watchedDate && watchedDate.getFullYear() === new Date().getFullYear()
  }).length
  const totalHours = Math.floor(totalRuntime / 60)
  const totalMinutes = totalRuntime % 60

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movies Tracker</h1>
          <p className="text-muted-foreground">Track your movie watching journey</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Movie Manually
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{totalMovies}</CardTitle>
            <CardDescription>Total Movies</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{totalHours}h {totalMinutes}m</CardTitle>
            <CardDescription>Total Runtime</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{avgRating}/10</CardTitle>
            <CardDescription>Average Rating</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{moviesThisYear}</CardTitle>
            <CardDescription>Movies This Year</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search for a Movie</CardTitle>
          <CardDescription>Find movies from The Movie Database</CardDescription>
        </CardHeader>
        <CardContent>
          <MovieSearch onSelectMovie={handleMovieSelect} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle>Your Movies</CardTitle>
            <div className="flex gap-4">
              <Input
                placeholder="Search movies by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
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
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger className="w-[150px]">
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poster</TableHead>
                    <TableHead>Title</TableHead>
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
                  {filteredAndSortedMovies.map((movie) => {
                    const hours = Math.floor(movie.runtime / 60)
                    const mins = movie.runtime % 60

                    return (
                      <TableRow key={movie.id}>
                        <TableCell>
                          {movie.posterImage && (
                            <img
                              src={movie.posterImage}
                              alt={movie.title}
                              className="h-16 w-12 rounded object-cover"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{movie.title}</TableCell>
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
                            ? new Date(movie.releaseDate).getFullYear()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {movie.dateWatched
                            ? new Date(movie.dateWatched).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{movie.rating}/10</span>
                          </div>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMovie ? "Edit Movie" : "Add New Movie"}
            </DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
