"use client"

import * as React from "react"
import { TVShow, TVShowSearchResult, Season, Episode } from "@/types/tvshow"
import { getTVShowDetails, getAllSeasons, getPosterUrl, getBackdropUrl } from "@/lib/api/tvshows"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { RewatchManager } from "@/components/rewatch-manager"
import { Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TVShowEntryFormProps {
  selectedShow: TVShowSearchResult | null
  onSubmit: (tvshow: Omit<TVShow, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  initialData?: TVShow
}

export function TVShowEntryForm({ selectedShow, onSubmit, onCancel, initialData }: TVShowEntryFormProps) {
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    status: initialData?.status || "Plan to Watch",
    dateIStarted: initialData?.dateIStarted ? new Date(initialData.dateIStarted) : null,
    dateIEnded: initialData?.dateIEnded ? new Date(initialData.dateIEnded) : null,
    notes: initialData?.notes || "",
    rewatchCount: initialData?.rewatchCount || 0
  })
  const [showDetails, setShowDetails] = React.useState<{
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
    first_air_date: string;
    last_air_date: string | null;
    genres: Array<{ id: number; name: string }>;
    networks: Array<{ id: number; name: string }>;
    created_by: Array<{ id: number; name: string }>;
    number_of_episodes: number;
    overview: string;
  } | null>(null)

  React.useEffect(() => {
    if (selectedShow && !initialData) {
      loadShowDetails()
    }
  }, [selectedShow])

  const loadShowDetails = async () => {
    if (!selectedShow) return

    setLoading(true)
    try {
      const details = await getTVShowDetails(selectedShow.id)
      if (details) {
        setShowDetails(details)
      }
    } catch (error) {
      console.error("Error loading show details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (initialData) {
      // Update existing show
      onSubmit({
        ...initialData,
        status: formData.status,
        dateIStarted: formData.dateIStarted?.toISOString() || null,
        dateIEnded: formData.dateIEnded?.toISOString() || null,
        notes: formData.notes,
        rewatchCount: formData.rewatchCount,
        rewatchHistory: [],
      })
      return
    }

    if (!selectedShow || !showDetails) return

    setLoading(true)
    try {
      // Fetch all seasons with episodes
      const seasonsData = await getAllSeasons(selectedShow.id, showDetails.number_of_seasons)

      const seasons: Season[] = seasonsData.map((season) => ({
        seasonNumber: season.season_number,
        name: season.name,
        episodes: season.episodes
          ? season.episodes.map((ep) => ({
              episodeNumber: ep.episode_number,
              name: ep.name,
              runtime: ep.runtime || showDetails.episode_run_time[0] || 0,
              airDate: ep.air_date || "",
              watched: false,
              dateWatched: null,
            }))
          : [],
      }))

      const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes.length, 0)

      onSubmit({
        tmdbId: selectedShow.id,
        title: showDetails.name,
        status: formData.status,
        creators: showDetails.created_by?.map((c: { id: number; name: string }) => c.name) || [],
        network: showDetails.networks[0]?.name || "Unknown",
        genres: showDetails.genres.map((g: { id: number; name: string }) => g.name),
        posterImage: getPosterUrl(showDetails.poster_path, 'w342'),
        backdropImage: getBackdropUrl(showDetails.backdrop_path, 'w780'),
        showStartDate: showDetails.first_air_date || "",
        showEndDate: showDetails.last_air_date || null,
        dateIStarted: formData.dateIStarted?.toISOString() || null,
        dateIEnded: formData.dateIEnded?.toISOString() || null,
        totalEpisodes,
        watchedEpisodes: 0,
        seasons,
        totalMinutes: 0,
        daysTracking: 0,
        rewatchCount: formData.rewatchCount,
        rewatchHistory: [],
        notes: formData.notes,
      })
    } catch (error) {
      console.error("Error submitting TV show:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !showDetails) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading show details...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showDetails && !initialData && (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-4">
            {showDetails.poster_path && (
              <img
                src={getPosterUrl(showDetails.poster_path, 'w185')}
                alt={showDetails.name}
                className="w-full sm:w-32 h-auto sm:h-48 object-cover rounded"
              />
            )}
            <div className="flex-1 space-y-1">
              <h3 className="text-base sm:text-lg font-semibold">{showDetails.name}</h3>
              {showDetails.created_by && showDetails.created_by.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Created by: {showDetails.created_by.map((c: { id: number; name: string }) => c.name).join(", ")}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Network: {showDetails.networks[0]?.name || "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground">
                Genres: {showDetails.genres.map((g: { id: number; name: string }) => g.name).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground">
                Aired: {showDetails.first_air_date ? new Date(showDetails.first_air_date).getFullYear() : "N/A"}
                {showDetails.last_air_date && ` - ${new Date(showDetails.last_air_date).getFullYear()}`}
              </p>
              <p className="text-sm text-muted-foreground">
                Episodes: {showDetails.number_of_episodes} ({showDetails.number_of_seasons} seasons)
              </p>
              <p className="text-sm text-muted-foreground">
                Runtime: ~{showDetails.episode_run_time[0] || "N/A"} min/episode
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Plan to Watch">Plan to Watch</SelectItem>
            <SelectItem value="Watching">Watching</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Stopped">Stopped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Date I Started Watching</Label>
          <DatePicker
            date={formData.dateIStarted}
            onDateChange={(date) => setFormData({ ...formData, dateIStarted: date })}
            placeholder="Pick start date"
          />
        </div>

        <div className="space-y-2">
          <Label>Date I Finished Watching</Label>
          <DatePicker
            date={formData.dateIEnded}
            onDateChange={(date) => setFormData({ ...formData, dateIEnded: date })}
            placeholder="Pick end date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          placeholder="Add any notes about this show..."
        />
      </div>

      {initialData && (
        <RewatchManager
          rewatchCount={formData.rewatchCount}
          onUpdate={(count) => setFormData({ ...formData, rewatchCount: count })}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update" : "Add"} Show
        </Button>
      </div>
    </form>
  )
}
