"use client"

import * as React from "react"
import { Movie, MovieSearchResult } from "@/types/movie"
import { getMovieDetails, getMovieCredits, getMoviePosterUrl, getMovieBackdropUrl } from "@/lib/api/movies"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Loader2, Star } from "lucide-react"

interface MovieEntryFormProps {
  selectedMovie: MovieSearchResult | null
  onSubmit: (movie: Omit<Movie, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  initialData?: Movie
}

export function MovieEntryForm({ selectedMovie, onSubmit, onCancel, initialData }: MovieEntryFormProps) {
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    dateWatched: initialData?.dateWatched ? new Date(initialData.dateWatched) : null,
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
        dateWatched: formData.dateWatched?.toISOString() || null,
        rating: formData.rating,
        notes: formData.notes,
      })
      return
    }

    if (!selectedMovie || !movieDetails) return

    onSubmit({
      tmdbId: selectedMovie.id,
      title: movieDetails.title,
      director,
      genres: movieDetails.genres.map((g: any) => g.name),
      runtime: movieDetails.runtime || 0,
      releaseDate: movieDetails.release_date || "",
      posterImage: getMoviePosterUrl(movieDetails.poster_path, 'w342'),
      backdropImage: getMovieBackdropUrl(movieDetails.backdrop_path, 'w780'),
      dateWatched: formData.dateWatched?.toISOString() || null,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {movieDetails && !initialData && (
        <div className="space-y-2">
          <div className="flex gap-4">
            {movieDetails.poster_path && (
              <img
                src={getMoviePosterUrl(movieDetails.poster_path, 'w185')}
                alt={movieDetails.title}
                className="w-32 h-48 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{movieDetails.title}</h3>
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
                Released: {movieDetails.release_date ? new Date(movieDetails.release_date).getFullYear() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Date Watched</Label>
          <DatePicker
            date={formData.dateWatched}
            onDateChange={(date) => setFormData({ ...formData, dateWatched: date })}
            placeholder="Pick date watched"
          />
        </div>

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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update" : "Add"} Movie
        </Button>
      </div>
    </form>
  )
}
