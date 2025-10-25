"use client"

import * as React from "react"
import { Season, Episode } from "@/types/tvshow"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { markEpisodeWatched } from "@/lib/store/tvshows-store"

interface EpisodeListProps {
  showId: string
  seasons: Season[]
  onUpdate: () => void
}

export function EpisodeList({ showId, seasons, onUpdate }: EpisodeListProps) {
  const [openSeasons, setOpenSeasons] = React.useState<Set<number>>(new Set([1]))
  const [editingDate, setEditingDate] = React.useState<{
    season: number
    episode: number
  } | null>(null)

  const toggleSeason = (seasonNumber: number) => {
    const newOpen = new Set(openSeasons)
    if (newOpen.has(seasonNumber)) {
      newOpen.delete(seasonNumber)
    } else {
      newOpen.add(seasonNumber)
    }
    setOpenSeasons(newOpen)
  }

  const handleEpisodeToggle = (
    seasonNumber: number,
    episodeNumber: number,
    watched: boolean
  ) => {
    markEpisodeWatched(showId, seasonNumber, episodeNumber, watched)
    onUpdate()
  }

  const handleDateChange = (
    seasonNumber: number,
    episodeNumber: number,
    newDate: string
  ) => {
    markEpisodeWatched(showId, seasonNumber, episodeNumber, true, newDate)
    setEditingDate(null)
    onUpdate()
  }

  const handleSelectAllSeason = (seasonNumber: number, watched: boolean) => {
    const season = seasons.find(s => s.seasonNumber === seasonNumber)
    if (!season) return

    season.episodes.forEach(episode => {
      markEpisodeWatched(showId, seasonNumber, episode.episodeNumber, watched)
    })
    onUpdate()
  }

  return (
    <div className="space-y-2">
      {seasons.map((season) => {
        const watchedCount = season.episodes.filter((e) => e.watched).length
        const totalCount = season.episodes.length
        const isOpen = openSeasons.has(season.seasonNumber)

        return (
          <Collapsible key={season.seasonNumber} open={isOpen} onOpenChange={() => toggleSeason(season.seasonNumber)}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-semibold">{season.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {watchedCount}/{totalCount} episodes
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              <div className="flex gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectAllSeason(season.seasonNumber, true)
                  }}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectAllSeason(season.seasonNumber, false)
                  }}
                >
                  Deselect All
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                {season.episodes.map((episode) => (
                  <div
                    key={episode.episodeNumber}
                    className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={episode.watched}
                      onCheckedChange={(checked) =>
                        handleEpisodeToggle(
                          season.seasonNumber,
                          episode.episodeNumber,
                          checked as boolean
                        )
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 flex flex-col sm:grid sm:grid-cols-4 gap-1 sm:gap-2 sm:items-center text-sm">
                      <div className="font-medium sm:col-span-1">
                        {episode.episodeNumber}. {episode.name}
                      </div>
                      <div className="text-muted-foreground text-xs sm:text-sm">
                        {episode.runtime ? `${episode.runtime} min` : "N/A"}
                        <span className="mx-2 hidden sm:inline">•</span>
                        <span className="sm:hidden"> • </span>
                        Aired: {episode.airDate
                          ? format(new Date(episode.airDate), "MMM d, yyyy")
                          : "N/A"}
                      </div>
                      <div className="sm:col-span-2">
                        {episode.watched && episode.dateWatched ? (
                          editingDate?.season === season.seasonNumber &&
                          editingDate?.episode === episode.episodeNumber ? (
                            <Input
                              type="date"
                              defaultValue={new Date(episode.dateWatched)
                                .toISOString()
                                .split("T")[0]}
                              onBlur={(e) => {
                                if (e.target.value) {
                                  handleDateChange(
                                    season.seasonNumber,
                                    episode.episodeNumber,
                                    new Date(e.target.value).toISOString()
                                  )
                                } else {
                                  setEditingDate(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement
                                  if (target.value) {
                                    handleDateChange(
                                      season.seasonNumber,
                                      episode.episodeNumber,
                                      new Date(target.value).toISOString()
                                    )
                                  }
                                } else if (e.key === "Escape") {
                                  setEditingDate(null)
                                }
                              }}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            <button
                              className="text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                              onClick={() =>
                                setEditingDate({
                                  season: season.seasonNumber,
                                  episode: episode.episodeNumber,
                                })
                              }
                            >
                              Watched: {format(new Date(episode.dateWatched), "MMM d, yyyy")}
                            </button>
                          )
                        ) : episode.watched ? (
                          <span className="text-muted-foreground text-xs sm:text-sm">Watched</span>
                        ) : (
                          <span className="text-muted-foreground text-xs sm:text-sm">Not watched</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}
