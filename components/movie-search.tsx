"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { MovieSearchResult } from "@/types/movie"
import { searchMovies, getMoviePosterUrl } from "@/lib/api/movies"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface MovieSearchProps {
  onSelectMovie: (movie: MovieSearchResult) => void
}

export function MovieSearch({ onSelectMovie }: MovieSearchProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<MovieSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const movies = await searchMovies(query)
      setResults(movies)
    } catch (error) {
      console.error("Error searching movies:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const genreMap: Record<number, string> = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search for movies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {loading && (
        <div className="text-center py-8 text-muted-foreground">Searching...</div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((movie) => (
            <Card
              key={movie.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelectMovie(movie)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {movie.poster_path && (
                    <img
                      src={getMoviePosterUrl(movie.poster_path, 'w154')}
                      alt={movie.title}
                      className="w-20 h-28 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{movie.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {movie.release_date
                        ? new Date(movie.release_date).getFullYear()
                        : "N/A"}
                    </p>
                    {movie.genre_ids && movie.genre_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {movie.genre_ids.slice(0, 2).map((genreId) => (
                          <Badge key={genreId} variant="secondary" className="text-xs">
                            {genreMap[genreId] || "Unknown"}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {movie.vote_average > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ⭐ {movie.vote_average.toFixed(1)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="text-center py-8 text-muted-foreground">
          No movies found. Try a different search.
        </div>
      )}
    </div>
  )
}
