"use client"

import * as React from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, List, Calendar, Clock, Tv } from "lucide-react"
import { TVShow, TVShowSearchResult } from "@/types/tvshow"
import { getTVShowsAction, addTVShowAction, updateTVShowAction, deleteTVShowAction } from "@/app/actions/tvshows"
import { getTVShowDetailAction } from "@/app/actions/tvshows-paginated"
import { TVShowSearch } from "@/components/tvshow-search"
import { TVShowEntryForm } from "@/components/tvshow-entry-form"
import { EpisodeList } from "@/components/episode-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { GridView, GridViewItem } from "@/components/ui/grid-view"
import { ViewToggle, useViewMode } from "@/components/ui/view-toggle"
import { MediaDetailModal } from "@/components/ui/media-detail-modal"
import { CollapsibleSection } from "@/components/ui/collapsible-section"

type TVShowSortField = "title" | "hours" | "progress" | "days"
type SortDirection = "asc" | "desc"
type TVShowStatus = "Watched" | "Watching" | "Watchlist"

const getShowProgressPercent = (show: TVShow): number => {
  if (show.totalEpisodes <= 0) return 0
  return Math.round((show.watchedEpisodes / show.totalEpisodes) * 100)
}

const getShowStatus = (show: TVShow): TVShowStatus => {
  const progress = getShowProgressPercent(show)
  if (progress >= 100) return "Watched"
  if (progress > 0) return "Watching"
  return "Watchlist"
}

const getBadgeVariant = (status: TVShowStatus): GridViewItem['badgeVariant'] => {
  switch (status) {
    case "Watched":
      return "secondary"
    case "Watchlist":
      return "outline"
    default:
      return "default"
  }
}

export default function TVShowsPage() {
  const [tvshows, setTVShows] = React.useState<TVShow[]>([])
  const [selectedShow, setSelectedShow] = React.useState<TVShowSearchResult | null>(null)
  const [editingShow, setEditingShow] = React.useState<TVShow | null>(null)
  const [viewingEpisodes, setViewingEpisodes] = React.useState<TVShow | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<TVShowSortField>("title")
  const [sortOrder, setSortOrder] = React.useState<SortDirection>("asc")

  // Grid view state
  const [viewMode, setViewMode] = useViewMode("table", "tvshows-view-mode")
  const [detailModalOpen, setDetailModalOpen] = React.useState(false)
  const [detailShow, setDetailShow] = React.useState<TVShow | null>(null)

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

  const handleEpisodesUpdate = React.useCallback(() => {
    ;(async () => {
      try {
        const data = await getTVShowsAction()
        setTVShows(data)

        if (viewingEpisodes) {
          const updated = data.find(s => s.id === viewingEpisodes.id)
          if (updated) {
            setViewingEpisodes(updated)
          }
        }
      } catch (error) {
        console.error("Failed to refresh TV shows after episode update:", error)
      }
    })()
  }, [viewingEpisodes])

  // Handle grid item click - load full details and show modal
  const handleGridItemClick = async (item: GridViewItem) => {
    setDetailModalOpen(true)
    try {
      const show = await getTVShowDetailAction(item.id)
      setDetailShow(show)
    } catch (error) {
      console.error("Failed to load TV show details:", error)
      // Fallback to using existing show data
      const show = tvshows.find(s => s.id === item.id)
      setDetailShow(show || null)
    }
  }

  // Close detail modal and reset state
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false)
    setDetailShow(null)
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

  const groupedShows = React.useMemo(() => {
    const groups: Record<"watching" | "watchlist" | "watched", TVShow[]> = {
      watching: [],
      watchlist: [],
      watched: [],
    }

    filteredAndSortedShows.forEach((show) => {
      const status = getShowStatus(show)
      if (status === "Watched") {
        groups.watched.push(show)
      } else if (status === "Watchlist") {
        groups.watchlist.push(show)
      } else {
        groups.watching.push(show)
      }
    })

    return groups
  }, [filteredAndSortedShows])

  const buildGridItem = (show: TVShow): GridViewItem => {
    const hours = Math.floor(show.totalMinutes / 60)
    const mins = show.totalMinutes % 60
    const timeText = `${hours}h ${mins}m`
    const progress = getShowProgressPercent(show)
    const status = getShowStatus(show)
    const episodeProgress = show.totalEpisodes > 0
      ? `${show.watchedEpisodes}/${show.totalEpisodes}`
      : `${show.watchedEpisodes}/?`

    const metadata: GridViewItem['metadata'] = [
      { label: "Episodes", value: episodeProgress },
      { label: "Progress", value: `${progress}%` },
    ]

    if (show.totalMinutes > 0) {
      metadata.push({ label: "Time", value: timeText })
    }

    if (show.rewatchCount > 0) {
      metadata.push({ label: "Rewatches", value: `${show.rewatchCount}` })
    }

    return {
      id: show.id,
      title: show.title,
      imageUrl: show.posterImage || '/placeholder-image.png',
      subtitle: show.network || (show.creators?.[0] || undefined),
      badge: status,
      badgeVariant: getBadgeVariant(status),
      metadata,
    }
  }

  const gridItemsByStatus = React.useMemo(() => ({
    watching: groupedShows.watching.map(buildGridItem),
    watchlist: groupedShows.watchlist.map(buildGridItem),
    watched: groupedShows.watched.map(buildGridItem),
  }), [groupedShows])

  const statusSections = [
    { key: 'watching', title: 'Watching' },
    { key: 'watchlist', title: 'Watchlist' },
    { key: 'watched', title: 'Watched' },
  ] as const

  const detailBadges = React.useMemo(() => {
    if (!detailShow) return []

    const status = getShowStatus(detailShow)
    const badges: Array<{ label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = [
      { label: status, variant: getBadgeVariant(status) },
    ]

    if (detailShow.rewatchCount > 0) {
      badges.push({ label: `Rewatched ${detailShow.rewatchCount}x`, variant: 'secondary' })
    }

    return badges
  }, [detailShow])

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
          <CardHeader className="p-3 md:p-6 gap-1 md:gap-2">
            <CardTitle className="text-xl md:text-2xl">{totalShows}</CardTitle>
            <CardDescription className="text-xs md:text-sm">Total Shows</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 md:p-6 gap-1 md:gap-2">
            <CardTitle className="text-xl md:text-2xl">{totalEpisodesWatched}</CardTitle>
            <CardDescription className="text-xs md:text-sm">Episodes Watched</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 md:p-6 gap-1 md:gap-2">
            <CardTitle className="text-xl md:text-2xl">{totalHours}h {remainingMinutes}m</CardTitle>
            <CardDescription className="text-xs md:text-sm">Total Hours Watched</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 md:p-6 gap-1 md:gap-2">
            <CardTitle className="text-xl md:text-2xl">{totalDaysTracking}</CardTitle>
            <CardDescription className="text-xs md:text-sm">Days Tracking</CardDescription>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Your TV Shows</CardTitle>
              <ViewToggle
                value={viewMode}
                onValueChange={setViewMode}
                storageKey="tvshows-view-mode"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Input
                placeholder="Search shows by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as TVShowSortField)}>
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
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortDirection)}>
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
          ) : viewMode === "grid" ? (
            <div className="space-y-8">
              {statusSections.map(({ key, title }) => {
                const items = gridItemsByStatus[key]
                if (items.length === 0) return null

                return (
                  <CollapsibleSection
                    key={key}
                    title={title}
                    count={items.length}
                    defaultOpen={true}
                    storageKey={`tvshows-section-${key}`}
                  >
                    <GridView
                      items={items}
                      onItemClick={handleGridItemClick}
                      aspectRatio="portrait"
                      emptyMessage={`No ${title.toLowerCase()} shows`}
                      emptyActionLabel="Add TV Show"
                      onEmptyAction={() => setShowForm(true)}
                    />
                  </CollapsibleSection>
                )
              })}
            </div>
          ) : (
            <div className="space-y-8">
              {statusSections.map(({ key, title }) => {
                const shows = groupedShows[key]
                if (shows.length === 0) return null

                return (
                  <CollapsibleSection
                    key={key}
                    title={title}
                    count={shows.length}
                    defaultOpen={true}
                    storageKey={`tvshows-section-${key}`}
                  >
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
                          {shows.map((show) => {
                            const status = getShowStatus(show)
                            const progress = getShowProgressPercent(show)
                            const hours = Math.floor(show.totalMinutes / 60)
                            const mins = show.totalMinutes % 60

                            return (
                              <TableRow key={show.id}>
                                <TableCell>
                                  {show.posterImage && (
                                    <Image
                                      src={show.posterImage}
                                      alt={show.title}
                                      width={48}
                                      height={64}
                                      className="h-16 w-12 rounded object-cover"
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium">{show.title}</span>
                                      <Badge variant={getBadgeVariant(status)} className="text-xs">
                                        {status}
                                      </Badge>
                                      {show.rewatchCount > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          Rewatched {show.rewatchCount}x
                                        </Badge>
                                      )}
                                    </div>
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

                    <div className="grid md:hidden grid-cols-1 gap-4">
                      {shows.map((show) => {
                        const status = getShowStatus(show)
                        const progress = getShowProgressPercent(show)
                        const hours = Math.floor(show.totalMinutes / 60)
                        const mins = show.totalMinutes % 60

                        return (
                          <Card key={show.id} className="overflow-hidden">
                            <div className="flex gap-4 p-4">
                              {show.posterImage && (
                                <Image
                                  src={show.posterImage}
                                  alt={show.title}
                                  width={96}
                                  height={128}
                                  className="h-32 w-24 rounded object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0 space-y-2">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold text-base leading-tight line-clamp-2">
                                      {show.title}
                                    </h3>
                                    <Badge variant={getBadgeVariant(status)} className="text-xs">
                                      {status}
                                    </Badge>
                                    {show.rewatchCount > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        Rewatched {show.rewatchCount}x
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
                  </CollapsibleSection>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TV Show Detail Modal */}
      <MediaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title={detailShow?.title || "Loading..."}
        subtitle={detailShow?.network || detailShow?.creators?.[0]}
        imageUrl={detailShow?.posterImage || '/placeholder-image.png'}
        posterAspectRatio="portrait"
        badges={detailShow ? detailBadges : []}
        primaryFields={detailShow ? [
          {
            label: "Episodes Watched",
            value: `${detailShow.watchedEpisodes}/${detailShow.totalEpisodes} episodes`,
            icon: <Tv className="h-4 w-4" />
          },
          {
            label: "Time Watched",
            value: `${Math.floor(detailShow.totalMinutes / 60)}h ${detailShow.totalMinutes % 60}m`,
            icon: <Clock className="h-4 w-4" />
          },
          {
            label: "Show Aired",
            value: detailShow.showStartDate ? `${new Date(detailShow.showStartDate).toLocaleDateString()}${detailShow.showEndDate ? ` - ${new Date(detailShow.showEndDate).toLocaleDateString()}` : ' - Present'}` : "N/A",
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: "You Started",
            value: detailShow.dateIStarted ? new Date(detailShow.dateIStarted).toLocaleDateString() : "Not started yet",
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: "Days Tracking",
            value: detailShow.daysTracking.toString(),
          },
        ] : []}
        secondaryFields={detailShow ? [
          {
            label: "Genres",
            value: detailShow.genres.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {detailShow.genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            ) : "No genres",
            fullWidth: true
          },
          {
            label: "Creators",
            value: detailShow.creators?.join(", ") || "N/A",
            fullWidth: true
          },
          {
            label: "TMDb ID",
            value: detailShow.tmdbId,
          },
          {
            label: "Added",
            value: new Date(detailShow.createdAt).toLocaleDateString(),
          },
          {
            label: "Last Updated",
            value: new Date(detailShow.updatedAt).toLocaleDateString(),
          },
        ] : []}
        notes={detailShow?.notes}
        actions={detailShow ? [
          {
            label: "View Episodes",
            icon: <List className="h-4 w-4" />,
            onClick: () => {
              handleViewEpisodes(detailShow)
              handleCloseDetailModal()
            },
            variant: "outline"
          },
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              handleEdit(detailShow)
              handleCloseDetailModal()
            },
            variant: "outline"
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: async () => {
              handleCloseDetailModal()
              await handleDelete(detailShow.id)
            },
            variant: "destructive"
          }
        ] : []}
      />

      {/* Add/Edit TV Show Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-3 sm:p-4 md:p-6 pb-3 sm:pb-4">
            <DialogTitle>
              {editingShow ? "Edit TV Show" : "Add New TV Show"}
            </DialogTitle>
            <DialogDescription>
              {editingShow ? "Update your TV show details and tracking information" : "Add a new TV show to your tracking list"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
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
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-3 sm:p-4 md:p-6 pb-3 sm:pb-4">
            <DialogTitle>
              {viewingEpisodes?.title} - Episodes
            </DialogTitle>
            <DialogDescription>
              Mark episodes as watched and track your progress
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4">
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
