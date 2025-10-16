"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, List } from "lucide-react"
import { TVShow, TVShowSearchResult } from "@/types/tvshow"
import { getTVShowsAction, addTVShowAction, updateTVShowAction, deleteTVShowAction } from "@/app/actions/tvshows"
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
      const data = await getTVShowsAction()
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
      await updateTVShowAction(Number(editingShow.id), showData)
    } else {
      await addTVShowAction(showData)
    }
    const data = await getTVShowsAction()
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
      await deleteTVShowAction(Number(id))
      const data = await getTVShowsAction()
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
  const totalEpisodesWatched = tvshows.reduce((total, show) => total + (show.watchedEpisodes || 0), 0)
  const totalMinutesWatched = tvshows.reduce((total, show) => total + (show.totalMinutes || 0), 0)
  const totalDaysTracking = tvshows.reduce((total, show) => total + (show.daysTracking || 0), 0)
  const totalHours = Math.floor(totalMinutesWatched / 60)
  const remainingMinutes = totalMinutesWatched % 60

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">TV Shows Tracker</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your TV show watching journey</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Show Manually
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Input
                placeholder="Search shows by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
          {filteredAndSortedShows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No TV shows found. Start adding shows to track your progress!
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poster</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Creator(s)</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Genres</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Aired</TableHead>
                    <TableHead>Watched</TableHead>
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
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{show.title}</span>
                            {show.rewatchCount > 0 && (
                              <Badge variant="secondary" className="text-xs w-fit mt-1">
                                Rewatched {show.rewatchCount}x
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {show.creators && show.creators.length > 0
                            ? show.creators.slice(0, 2).join(", ")
                            : "-"}
                        </TableCell>
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

            {/* Mobile Card View */}
            <div className="grid md:hidden grid-cols-1 gap-4">
              {filteredAndSortedShows.map((show) => {
                const hours = Math.floor(show.totalMinutes / 60)
                const mins = show.totalMinutes % 60
                const progress = show.totalEpisodes > 0
                  ? Math.round((show.watchedEpisodes / show.totalEpisodes) * 100)
                  : 0

                return (
                  <Card key={show.id} className="overflow-hidden">
                    <div className="flex gap-4 p-4">
                      {show.posterImage && (
                        <img
                          src={show.posterImage}
                          alt={show.title}
                          className="h-32 w-24 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base leading-tight line-clamp-2">
                              {show.title}
                            </h3>
                            {show.rewatchCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {show.rewatchCount}x
                              </Badge>
                            )}
                          </div>
                          {show.creators && show.creators.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              by {show.creators[0]}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {show.network}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {show.genres.slice(0, 3).map((genre) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Progress:</span>
                            <span className="font-medium">
                              {show.watchedEpisodes}/{show.totalEpisodes} ({progress}%)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Hours:</span>
                            <span className="font-medium">{hours}h {mins}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Days:</span>
                            <span className="font-medium">{show.daysTracking}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEpisodes(show)}
                            className="text-xs"
                          >
                            <List className="h-3.5 w-3.5 mr-1" />
                            Episodes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(show)}
                            className="text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(show.id)}
                            className="text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-3xl h-[90vh] flex flex-col p-0 gap-0 sm:h-auto sm:max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-4">
            <DialogTitle>
              {editingShow ? "Edit TV Show" : "Add New TV Show"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-4 sm:px-6">
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
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEpisodes} onOpenChange={() => setViewingEpisodes(null)}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-5xl h-[90vh] flex flex-col p-0 gap-0 sm:h-auto sm:max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-4">
            <DialogTitle>
              {viewingEpisodes?.title} - Episodes
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4">
            {viewingEpisodes && (
              <EpisodeList
                showId={viewingEpisodes.id}
                seasons={viewingEpisodes.seasons}
                onUpdate={handleEpisodesUpdate}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
