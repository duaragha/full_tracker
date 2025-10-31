"use client"

import * as React from "react"
import { Check, PlayCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Episode {
  episodeNumber: number
  name: string
  runtime: number
  airDate: string
  watched: boolean
  dateWatched: string | null
}

interface Season {
  seasonNumber: number
  name: string
  episodes: Episode[]
}

interface NextEpisodesListProps {
  showId: string
  seasons: Season[]
  onEpisodeWatched: (seasonNumber: number, episodeNumber: number) => Promise<void>
  maxEpisodes?: number
}

export function NextEpisodesList({
  showId,
  seasons,
  onEpisodeWatched,
  maxEpisodes = 4
}: NextEpisodesListProps) {
  const [markingWatched, setMarkingWatched] = React.useState<string | null>(null)
  const [localSeasons, setLocalSeasons] = React.useState(seasons)

  // Update local seasons when props change
  React.useEffect(() => {
    setLocalSeasons(seasons)
  }, [seasons])

  // Find the next unwatched episodes
  const getNextUnwatchedEpisodes = React.useMemo(() => {
    const unwatched: Array<{
      seasonNumber: number
      episodeNumber: number
      name: string
      runtime: number
      airDate: string
      seasonName: string
    }> = []

    for (const season of localSeasons) {
      for (const episode of season.episodes) {
        if (!episode.watched) {
          unwatched.push({
            seasonNumber: season.seasonNumber,
            episodeNumber: episode.episodeNumber,
            name: episode.name,
            runtime: episode.runtime,
            airDate: episode.airDate,
            seasonName: season.name
          })
          if (unwatched.length >= maxEpisodes) {
            return unwatched
          }
        }
      }
    }

    return unwatched
  }, [localSeasons, maxEpisodes])

  const handleMarkWatched = async (seasonNumber: number, episodeNumber: number) => {
    const episodeKey = `${seasonNumber}-${episodeNumber}`
    setMarkingWatched(episodeKey)

    try {
      // Call the parent's handler - it will reload the show data
      await onEpisodeWatched(seasonNumber, episodeNumber)
      // Parent will update seasons prop, which triggers useEffect to update localSeasons
    } catch (error) {
      console.error('Failed to mark episode as watched:', error)
    } finally {
      setMarkingWatched(null)
    }
  }

  if (getNextUnwatchedEpisodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
        <p className="text-lg font-medium">All caught up!</p>
        <p className="text-sm">You've watched all available episodes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Next Episodes to Watch</h3>
        <Badge variant="secondary">
          {getNextUnwatchedEpisodes.length} unwatched
        </Badge>
      </div>

      <div className="space-y-2">
        {getNextUnwatchedEpisodes.map((episode, index) => {
          const episodeKey = `${episode.seasonNumber}-${episode.episodeNumber}`
          const isMarking = markingWatched === episodeKey

          return (
            <Card
              key={episodeKey}
              className={cn(
                "p-4 transition-all",
                index === 0 && "border-primary/50 bg-primary/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {index === 0 ? (
                    <PlayCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="font-medium leading-tight">
                          {episode.name || `Episode ${episode.episodeNumber}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {episode.seasonName} • Episode {episode.episodeNumber}
                          {episode.runtime > 0 && ` • ${episode.runtime} min`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={index === 0 ? "default" : "outline"}
                        onClick={() => handleMarkWatched(episode.seasonNumber, episode.episodeNumber)}
                        disabled={isMarking}
                        className="flex-shrink-0"
                      >
                        {isMarking ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                            Marking...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Watched
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {episode.airDate && (
                    <p className="text-xs text-muted-foreground">
                      Aired: {new Date(episode.airDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
