"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, List } from "lucide-react"
import { TVShow, TVShowSearchResult } from "@/types/tvshow"
import {
  getTVShows,
  addTVShow,
  updateTVShow,
  deleteTVShow,
  calculateTotalEpisodes,
  calculateTotalMinutes,
  calculateTotalDays,
} from "@/lib/db/tvshows-store"
import { TVShowSearch } from "@/components/tvshow-search"
import { TVShowEntryForm } from "@/components/tvshow-entry-form"
import { EpisodeList } from "@/components/episode-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function TVShowsPage() {
  const [tvshows, setTVShows] = React.useState<TVShow[]>([])
  const [selectedShow, setSelectedShow] = React.useState<TVShowSearchResult | null>(null)
  const [editingShow, setEditingShow] = React.useState<TVShow | null>(null)
  const [viewingEpisodes, setViewingEpisodes] = React.useState<TVShow | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"title" | "hours" | "progress" | "days">("title")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  React.useEffect(() => {
    const loadTVShows = async () => {
      const data = await getTVShows()
      setTVShows(data)
    }
    loadTVShows()
  }, [])

  const handleShowSelect = (show: TVShowSearchResult) => {
    setSelectedShow(show)
    setEditingShow(null)
    setShowForm(true)
  }

  const handleSubmit = async (showData: Omit<TVShow, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingShow) {
      await updateTVShow(Number(editingShow.id), showData)
    } else {
      await addTVShow(showData)
    }
    const data = await getTVShows()
    setTVShows(data)
    setShowForm(false)
    setSelectedShow(null)
    setEditingShow(null)
  }

  const handleEdit = (show: TVShow) => {
    setEditingShow(show)
    setSelectedShow(null)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this TV show?")) {
      await deleteTVShow(Number(id))
      const data = await getTVShows()
      setTVShows(data)
    }
  }

  const handleViewEpisodes = (show: TVShow) => {
    setViewingEpisodes(show)
  }

  const handleEpisodesUpdate = () => {
    setTVShows(getTVShows())
    if (viewingEpisodes) {
      const updated = getTVShows().find(s => s.id === viewingEpisodes.id)
      if (updated) {
        setViewingEpisodes(updated)
      }
    }
  }

  const filteredAndSortedShows = React.useMemo(() => {
    let filtered = tvshows

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(show =>
        show.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "hours":
          comparison = a.totalMinutes - b.totalMinutes
          break
        case "progress":
          const progressA = a.totalEpisodes > 0 ? a.watchedEpisodes / a.totalEpisodes : 0
          const progressB = b.totalEpisodes > 0 ? b.watchedEpisodes / b.totalEpisodes : 0
          comparison = progressA - progressB
          break
        case "days":
          comparison = a.daysTracking - b.daysTracking
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return sorted
  }, [tvshows, searchQuery, sortBy, sortOrder])

  const totalShows = tvshows.length
  const totalEpisodesWatched = calculateTotalEpisodes(tvshows)
  const totalMinutesWatched = calculateTotalMinutes(tvshows)
  const totalDaysTracking = calculateTotalDays(tvshows)
  const totalHours = Math.floor(totalMinutesWatched / 60)
  const remainingMinutes = totalMinutesWatched % 60

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TV Shows Tracker</h1>
          <p className="text-muted-foreground">Track your TV show watching journey</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Show Manually
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{totalShows}</CardTitle>
            <CardDescription>Total Shows</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{totalEpisodesWatched}</CardTitle>
            <CardDescription>Episodes Watched</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{totalHours}h {remainingMinutes}m</CardTitle>
            <CardDescription>Total Hours Watched</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{totalDaysTracking}</CardTitle>
            <CardDescription>Days Tracking</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search for a TV Show</CardTitle>
          <CardDescription>Find shows from The Movie Database</CardDescription>
        </CardHeader>
        <CardContent>
          <TVShowSearch onSelectShow={handleShowSelect} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle>Your TV Shows</CardTitle>
            <div className="flex gap-4">
              <Input
                placeholder="Search shows by title..."
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
                  <SelectItem value="hours">Hours Watched</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="days">Days Tracking</SelectItem>
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
          {filteredAndSortedShows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No TV shows found. Start adding shows to track your progress!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poster</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Genres</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Aired</TableHead>
                    <TableHead>Watched</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedShows.map((show) => {
                    const hours = Math.floor(show.totalMinutes / 60)
                    const mins = show.totalMinutes % 60
                    const progress = show.totalEpisodes > 0
                      ? Math.round((show.watchedEpisodes / show.totalEpisodes) * 100)
                      : 0

                    return (
                      <TableRow key={show.id}>
                        <TableCell>
                          {show.posterImage && (
                            <img
                              src={show.posterImage}
                              alt={show.title}
                              className="h-16 w-12 rounded object-cover"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{show.title}</TableCell>
                        <TableCell>{show.network}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {show.genres.slice(0, 2).map((genre) => (
                              <Badge key={genre} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{show.watchedEpisodes}/{show.totalEpisodes}</span>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{hours}h {mins}m</TableCell>
                        <TableCell className="text-sm">
                          {show.showStartDate
                            ? new Date(show.showStartDate).getFullYear()
                            : "N/A"}
                          {show.showEndDate && ` - ${new Date(show.showEndDate).getFullYear()}`}
                        </TableCell>
                        <TableCell className="text-sm">
                          {show.dateIStarted
                            ? new Date(show.dateIStarted).toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                          {show.dateIEnded &&
                            ` - ${new Date(show.dateIEnded).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })}`}
                        </TableCell>
                        <TableCell>{show.daysTracking}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewEpisodes(show)}
                              title="View Episodes"
                            >
                              <List className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(show)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(show.id)}
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
              {editingShow ? "Edit TV Show" : "Add New TV Show"}
            </DialogTitle>
          </DialogHeader>
          <TVShowEntryForm
            selectedShow={selectedShow}
            initialData={editingShow || undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false)
              setSelectedShow(null)
              setEditingShow(null)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEpisodes} onOpenChange={() => setViewingEpisodes(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingEpisodes?.title} - Episodes
            </DialogTitle>
          </DialogHeader>
          {viewingEpisodes && (
            <EpisodeList
              showId={viewingEpisodes.id}
              seasons={viewingEpisodes.seasons}
              onUpdate={handleEpisodesUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
