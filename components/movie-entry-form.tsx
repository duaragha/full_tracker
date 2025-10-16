"use client"

import * as React from "react"
import { Movie, MovieSearchResult } from "@/types/movie"
import { getMovieDetails, getMovieCredits, getMoviePosterUrl, getMovieBackdropUrl } from "@/lib/api/movies"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Star } from "lucide-react"

interface MovieEntryFormProps {
  selectedMovie: MovieSearchResult | null
  onSubmit: (movie: Omit<Movie, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  initialData?: Movie
}

export function MovieEntryForm({ selectedMovie, onSubmit, onCancel, initialData }: MovieEntryFormProps) {
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState<{
    status: 'Watched' | 'Watchlist'
    dateWatched: Date | null
    watchlistAddedDate: Date | null
    rating: number
    notes: string
  }>({
    status: initialData?.status || 'Watched',
    dateWatched: initialData?.dateWatched ? new Date(initialData.dateWatched) : null,
    watchlistAddedDate: initialData?.watchlistAddedDate ? new Date(initialData.watchlistAddedDate) : null,
    rating: initialData?.rating || 5,
    notes: initialData?.notes || "",
  })
  const [movieDetails, setMovieDetails] = React.useState<any>(null)
  const [director, setDirector] = React.useState<string>("")

  React.useEffect(() => {
    if (selectedMovie && !initialData) {
      loadMovieDetails()
    } else if (initialData) {
      setDirector(initialData.director)
    }
  }, [selectedMovie])

  const loadMovieDetails = async () => {
    if (!selectedMovie) return

    setLoading(true)
    try {
      const [details, credits] = await Promise.all([
        getMovieDetails(selectedMovie.id),
        getMovieCredits(selectedMovie.id)
      ])

      if (details) {
        setMovieDetails(details)
      }

      if (credits) {
        const directorCrew = credits.crew.find((person) => person.job === "Director")
        setDirector(directorCrew?.name || "Unknown")
      }
    } catch (error) {
      console.error("Error loading movie details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (initialData) {
      // Update existing movie
      onSubmit({
        ...initialData,
        status: formData.status,
        dateWatched: formData.dateWatched?.toISOString().split('T')[0] || null,
        watchlistAddedDate: formData.watchlistAddedDate?.toISOString().split('T')[0] || null,
        rating: formData.rating,
        notes: formData.notes,
      })
      return
    }

    if (!selectedMovie || !movieDetails) return

    const releaseYear = movieDetails.release_date
      ? parseInt(movieDetails.release_date.substring(0, 4))
      : null

    onSubmit({
      tmdbId: selectedMovie.id,
      title: movieDetails.title,
      director,
      genres: movieDetails.genres.map((g: any) => g.name),
      runtime: movieDetails.runtime || 0,
      releaseYear,
      posterImage: getMoviePosterUrl(movieDetails.poster_path, 'w342'),
      status: formData.status,
      dateWatched: formData.dateWatched?.toISOString().split('T')[0] || null,
      watchlistAddedDate: formData.watchlistAddedDate?.toISOString().split('T')[0] || null,
      rating: formData.rating,
      notes: formData.notes,
    })
  }

  if (loading && !movieDetails) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading movie details...</span>
      </div>
    )
  }

  const hours = movieDetails ? Math.floor(movieDetails.runtime / 60) : 0
  const minutes = movieDetails ? movieDetails.runtime % 60 : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {movieDetails && !initialData && (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-4">
            {movieDetails.poster_path && (
              <img
                src={getMoviePosterUrl(movieDetails.poster_path, 'w185')}
                alt={movieDetails.title}
                className="w-full sm:w-32 h-auto sm:h-48 object-cover rounded"
              />
            )}
            <div className="flex-1 space-y-1">
              <h3 className="text-base sm:text-lg font-semibold">{movieDetails.title}</h3>
              <p className="text-sm text-muted-foreground">
                Director: {director}
              </p>
              <p className="text-sm text-muted-foreground">
                Genres: {movieDetails.genres.map((g: any) => g.name).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground">
                Runtime: {hours}h {minutes}m
              </p>
              <p className="text-sm text-muted-foreground">
                Released: {movieDetails.release_date
                  ? movieDetails.release_date.substring(0, 4)
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: 'Watched' | 'Watchlist') => {
              setFormData({
                ...formData,
                status: value,
                // Auto-set watchlistAddedDate when switching to Watchlist
                watchlistAddedDate: value === 'Watchlist' && !formData.watchlistAddedDate
                  ? new Date()
                  : formData.watchlistAddedDate,
                // Clear dateWatched when switching to Watchlist
                dateWatched: value === 'Watchlist' ? null : formData.dateWatched,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Watched">Watched</SelectItem>
              <SelectItem value="Watchlist">Watchlist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.status === 'Watched' && (
          <div className="space-y-2">
            <Label>Date Watched</Label>
            <DatePicker
              date={formData.dateWatched}
              onDateChange={(date) => setFormData({ ...formData, dateWatched: date })}
              placeholder="Pick date watched"
            />
          </div>
        )}

        {formData.status === 'Watchlist' && (
          <div className="space-y-2">
            <Label>Watchlist Added Date</Label>
            <DatePicker
              date={formData.watchlistAddedDate}
              onDateChange={(date) => setFormData({ ...formData, watchlistAddedDate: date })}
              placeholder="Pick watchlist added date"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="rating">Your Rating: {formData.rating}/10</Label>
          <div className="flex items-center gap-2">
            <Input
              id="rating"
              type="range"
              min="1"
              max="10"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
              className="flex-1"
            />
            <div className="flex gap-1">
              {Array.from({ length: formData.rating }, (_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder="Add your thoughts about this movie..."
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update" : "Add"} Movie
        </Button>
      </div>
    </form>
  )
}
