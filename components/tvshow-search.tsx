"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { TVShowSearchResult } from "@/types/tvshow"
import { searchTVShows, getPosterUrl } from "@/lib/api/tvshows"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TVShowSearchProps {
  onSelectShow: (show: TVShowSearchResult) => void
}

export function TVShowSearch({ onSelectShow }: TVShowSearchProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<TVShowSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const shows = await searchTVShows(query)
      setResults(shows)
    } catch (error) {
      console.error("Error searching TV shows:", error)
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
    10759: "Action & Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    10762: "Kids",
    9648: "Mystery",
    10763: "News",
    10764: "Reality",
    10765: "Sci-Fi & Fantasy",
    10766: "Soap",
    10767: "Talk",
    10768: "War & Politics",
    37: "Western",
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search for TV shows..."
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
          {results.map((show) => (
            <Card
              key={show.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelectShow(show)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {show.poster_path && (
                    <img
                      src={getPosterUrl(show.poster_path, 'w154')}
                      alt={show.name}
                      className="w-20 h-28 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{show.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {show.first_air_date
                        ? new Date(show.first_air_date).getFullYear()
                        : "N/A"}
                    </p>
                    {show.origin_country && show.origin_country.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {show.origin_country.join(", ")}
                      </p>
                    )}
                    {show.genre_ids && show.genre_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {show.genre_ids.slice(0, 2).map((genreId) => (
                          <Badge key={genreId} variant="secondary" className="text-xs">
                            {genreMap[genreId] || "Unknown"}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {show.vote_average > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ⭐ {show.vote_average.toFixed(1)}
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
          No TV shows found. Try a different search.
        </div>
      )}
    </div>
  )
}
