"use client"

import * as React from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, Download, Calendar, Clock, DollarSign, Gamepad2 } from "lucide-react"
import { Game, GameSearchResult } from "@/types/game"
import { getGamesAction, addGameAction, updateGameAction, deleteGameAction, enrichGamesWithRAWGDataAction } from "@/app/actions/games"
import { getGameDetailAction } from "@/app/actions/games-paginated"
import { getGameDetails } from "@/lib/api/games"
import { GameSearch } from "@/components/game-search"
import { GameEntryForm } from "@/components/game-entry-form"
import { GameTableRow } from "@/components/game-table-row"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { GridView, GridViewItem } from "@/components/ui/grid-view"
import { ViewToggle, useViewMode } from "@/components/ui/view-toggle"
import { MediaDetailModal } from "@/components/ui/media-detail-modal"
import { CollapsibleSection } from "@/components/ui/collapsible-section"

type GameSortField = "title" | "progress" | "hours" | "days"
type GameSortOrder = "asc" | "desc"
type GameStatusFilter = "All" | Game["status"]
type EnhancedGameSearchResult = GameSearchResult & {
  developers?: string[]
  genres?: string[]
}

export default function GamesPage() {
  const [games, setGames] = React.useState<Game[]>([])
  const [selectedGame, setSelectedGame] = React.useState<EnhancedGameSearchResult | null>(null)
  const [editingGame, setEditingGame] = React.useState<Game | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<GameStatusFilter>("All")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<GameSortField>("title")
  const [sortOrder, setSortOrder] = React.useState<GameSortOrder>("asc")
  const [isEnriching, setIsEnriching] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState<number>(20)

  // Grid view state
  const [viewMode, setViewMode] = useViewMode("table", "games-view-mode")
  const [detailModalOpen, setDetailModalOpen] = React.useState(false)
  const [detailGame, setDetailGame] = React.useState<Game | null>(null)

  React.useEffect(() => {
    const loadGames = async () => {
      const data = await getGamesAction()
      setGames(data)
    }
    loadGames()
  }, [])

  const handleGameSelect = async (game: GameSearchResult) => {
    // Fetch full game details including developer and genres
    const fullDetails = await getGameDetails(game.id)
    if (fullDetails) {
      const enhancedGame: EnhancedGameSearchResult = {
        ...game,
        developers: fullDetails.developers,
        genres: fullDetails.genres,
      }
      setSelectedGame(enhancedGame)
    } else {
      setSelectedGame(game)
    }
    setEditingGame(null)
    setShowForm(true)
  }

  const handleSubmit = async (gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingGame) {
      await updateGameAction(Number(editingGame.id), gameData)
    } else {
      await addGameAction(gameData)
    }
    const data = await getGamesAction()
    setGames(data)
    setShowForm(false)
    setSelectedGame(null)
    setEditingGame(null)
  }

  const handleEdit = (game: Game) => {
    setEditingGame(game)
    setSelectedGame(null)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this game?")) {
      await deleteGameAction(Number(id))
      const data = await getGamesAction()
      setGames(data)
    }
  }

  const handleEnrichGames = async () => {
    if (!confirm(`This will search RAWG for missing data (developer, genres, cover images) for all games. This may take a few minutes. Continue?`)) {
      return
    }

    setIsEnriching(true)
    try {
      const results = await enrichGamesWithRAWGDataAction()

      const message = [
        `Enrichment completed!`,
        `Updated: ${results.updated}`,
        `Skipped (already complete): ${results.skipped}`,
        `Failed: ${results.failed}`,
      ]

      if (results.errors.length > 0) {
        message.push(`\nErrors:\n${results.errors.slice(0, 10).join('\n')}`)
        if (results.errors.length > 10) {
          message.push(`\n... and ${results.errors.length - 10} more errors`)
        }
      }

      alert(message.join('\n'))

      const data = await getGamesAction()
      setGames(data)
    } catch (error) {
      alert(`Failed to enrich games: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsEnriching(false)
    }
  }

  // Handle grid item click - load full details and show modal
  const handleGridItemClick = async (item: GridViewItem) => {
    setDetailModalOpen(true)
    try {
      const game = await getGameDetailAction(item.id)
      setDetailGame(game)
    } catch (error) {
      console.error("Failed to load game details:", error)
      // Fallback to using existing game data
      const game = games.find(g => g.id === item.id)
      setDetailGame(game || null)
    }
  }

  // Close detail modal and reset state
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false)
    setDetailGame(null)
  }

  const filteredAndSortedGames = React.useMemo(() => {
    let filtered = statusFilter === "All"
      ? games
      : games.filter(g => g.status === statusFilter)

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "progress":
          comparison = a.percentage - b.percentage
          break
        case "hours":
          const hoursA = a.hoursPlayed + a.minutesPlayed / 60
          const hoursB = b.hoursPlayed + b.minutesPlayed / 60
          comparison = hoursA - hoursB
          break
        case "days":
          comparison = a.daysPlayed - b.daysPlayed
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return sorted
  }, [games, statusFilter, searchQuery, sortBy, sortOrder])

  const groupedGames = React.useMemo(() => {
    const groups: Record<"completed" | "playing" | "playlist" | "stopped", Game[]> = {
      completed: [],
      playing: [],
      playlist: [],
      stopped: [],
    }

    filteredAndSortedGames.forEach((game) => {
      if (game.status === "Completed") {
        groups.completed.push(game)
      } else if (game.status === "Playing") {
        groups.playing.push(game)
      } else if (game.status === "Playlist") {
        groups.playlist.push(game)
      } else {
        groups.stopped.push(game)
      }
    })

    return groups
  }, [filteredAndSortedGames])

  // Convert games to grid items
  const buildGridItem = (game: Game): GridViewItem => {
    const hoursText = `${game.hoursPlayed}h ${game.minutesPlayed}m`

    return {
      id: game.id,
      title: game.title,
      imageUrl: game.coverImage || '/placeholder-image.png',
      subtitle: game.console,
      badge: game.status,
      badgeVariant: getStatusColor(game.status),
      metadata: game.percentage ? [
        { label: "Hours", value: hoursText },
        { label: "Progress", value: `${game.percentage}%` }
      ] : [
        { label: "Hours", value: hoursText }
      ]
    }
  }

  const gridItemsByStatus = React.useMemo(() => ({
    completed: groupedGames.completed.map(buildGridItem),
    playing: groupedGames.playing.map(buildGridItem),
    playlist: groupedGames.playlist.map(buildGridItem),
    stopped: groupedGames.stopped.map(buildGridItem),
  }), [groupedGames])

  const statusSections = [
    { key: 'completed', title: 'Completed' },
    { key: 'playing', title: 'Playing' },
    { key: 'playlist', title: 'Playlist' },
    { key: 'stopped', title: 'Stopped' },
  ] as const

  // Pagination
  const showAll = itemsPerPage === filteredAndSortedGames.length || itemsPerPage >= 999
  const totalPages = showAll ? 1 : Math.ceil(filteredAndSortedGames.length / itemsPerPage)
  const paginatedGames = React.useMemo(() => {
    if (showAll) return filteredAndSortedGames
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedGames.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedGames, currentPage, itemsPerPage, showAll])

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery, sortBy, sortOrder])

  const totalDays = games.reduce((sum, g) => sum + g.daysPlayed, 0)
  const totalHours = games.reduce((sum, g) => sum + g.hoursPlayed + g.minutesPlayed / 60, 0)
  const avgPercentage = games.length > 0 ? Math.round(games.reduce((sum, g) => sum + g.percentage, 0) / games.length) : 0
  const totalCost = games.reduce((sum, g) => sum + (g.price || 0), 0)

  // Find oldest and newest games by start date
  const gamesWithStartDate = games.filter(g => g.dateStarted)
  const oldestGame = gamesWithStartDate.length > 0
    ? gamesWithStartDate.reduce((oldest, game) =>
        new Date(game.dateStarted) < new Date(oldest.dateStarted) ? game : oldest
      )
    : null
  const newestGame = gamesWithStartDate.length > 0
    ? gamesWithStartDate.reduce((newest, game) =>
        new Date(game.dateStarted) > new Date(newest.dateStarted) ? game : newest
      )
    : null

  function getStatusColor(status: Game['status']): 'default' | 'secondary' | 'destructive' {
    switch (status) {
      case 'Playing':
        return 'default'
      case 'Completed':
        return 'secondary'
      case 'Stopped':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Games Tracker</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your gaming journey</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleEnrichGames}
            disabled={isEnriching || games.length === 0}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {isEnriching ? 'Enriching...' : 'Enrich Missing Data'}
          </Button>
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Game Manually
          </Button>
        </div>
      </div>

      <div className="w-full grid gap-1.5 sm:gap-2 md:gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{games.length}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Total Games</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{totalHours.toFixed(1)}h</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Total Hours Played</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{avgPercentage}%</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Average Percentage</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{totalDays}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Total Days</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">${totalCost.toFixed(2)}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Total Cost</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="truncate text-base sm:text-lg">
              {oldestGame ? oldestGame.title : 'N/A'}
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">
              Oldest Game {oldestGame && `(${new Date(oldestGame.dateStarted).getFullYear()})`}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="truncate text-base sm:text-lg">
              {newestGame ? newestGame.title : 'N/A'}
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">
              Newest Game {newestGame && `(${new Date(newestGame.dateStarted).getFullYear()})`}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">Search for a Game</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Find games from the RAWG database</CardDescription>
          </CardHeader>
          <CardContent>
            <GameSearch onSelectGame={handleGameSelect} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-xl sm:text-2xl">Your Games</CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <ViewToggle
                  value={viewMode}
                  onValueChange={setViewMode}
                  storageKey="games-view-mode"
                />
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as GameStatusFilter)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Games</SelectItem>
                    <SelectItem value="Playing">Playing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Stopped">Stopped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4" suppressHydrationWarning>
              <Input
                placeholder="Search games by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as GameSortField)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="hours">Hours Played</SelectItem>
                  <SelectItem value="days">Days Played</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as GameSortOrder)}>
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
          {filteredAndSortedGames.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No games found. Start adding games to track your progress!
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
                    storageKey={`games-section-${key}`}
                  >
                    <GridView
                      items={items}
                      onItemClick={handleGridItemClick}
                      aspectRatio="portrait"
                      emptyMessage={`No ${title.toLowerCase()} games`}
                      emptyActionLabel="Add Game"
                      onEmptyAction={() => setShowForm(true)}
                    />
                  </CollapsibleSection>
                )
              })}
            </div>
          ) : (
            <div className="space-y-8">
              {statusSections.map(({ key, title }) => {
                const games = groupedGames[key]
                if (games.length === 0) return null

                return (
                  <CollapsibleSection
                    key={key}
                    title={title}
                    count={games.length}
                    defaultOpen={true}
                    storageKey={`games-section-${key}`}
                  >
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cover</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Days</TableHead>
                            <TableHead>Console</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Hrs/$</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {games.map((game) => (
                      <GameTableRow
                        key={game.id}
                        game={game}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        getStatusColor={getStatusColor}
                      />
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="grid md:hidden grid-cols-1 gap-4">
                      {games.map((game) => (
                  <Card key={game.id} className="overflow-hidden">
                    <div className="flex gap-4 p-4">
                      {game.coverImage && (
                        <Image
                          src={game.coverImage}
                          alt={game.title}
                          width={96}
                          height={128}
                          className="h-32 w-24 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <h3 className="font-semibold text-base leading-tight line-clamp-2">
                            {game.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {game.console}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(game.status)}>
                            {game.status}
                          </Badge>
                          <span className="text-sm font-medium">{game.percentage}%</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">Hours:</span>
                            <span className="ml-1 font-medium">
                              {game.hoursPlayed}h {game.minutesPlayed}m
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Days:</span>
                            <span className="ml-1 font-medium">{game.daysPlayed}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <span className="ml-1 font-medium">
                              {game.isGift ? 'Gift' : `$${game.price.toFixed(2)}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Hrs/$:</span>
                            <span className="ml-1 font-medium">
                              {game.isGift ? 'Gift' : game.pricePerHour.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(game)}
                            className="flex-1"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(game.id)}
                            className="flex-1"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                        </div>
                      </Card>
                      ))}
                    </div>
                  </CollapsibleSection>
                )
              })}
            </div>
          )}

          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {showAll
                  ? `Showing all ${filteredAndSortedGames.length} games`
                  : `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredAndSortedGames.length)} of ${filteredAndSortedGames.length} games`
                }
              </div>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  const num = value === "all" ? 9999 : parseInt(value)
                  setItemsPerPage(num)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                  <SelectItem value="all">Show all</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!showAll && totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Game Detail Modal */}
      <MediaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title={detailGame?.title || "Loading..."}
        subtitle={detailGame?.console}
        imageUrl={detailGame?.coverImage || '/placeholder-image.png'}
        posterAspectRatio="portrait"
        badges={detailGame ? [{ label: detailGame.status, variant: getStatusColor(detailGame.status) }] : []}
        primaryFields={detailGame ? [
          {
            label: "Hours Played",
            value: `${detailGame.hoursPlayed}h ${detailGame.minutesPlayed}m`,
            icon: <Clock className="h-4 w-4" />
          },
          {
            label: "Progress",
            value: `${detailGame.percentage}%`,
            icon: <Gamepad2 className="h-4 w-4" />
          },
          {
            label: "Days Played",
            value: detailGame.daysPlayed.toString(),
          },
          {
            label: "Started",
            value: detailGame.dateStarted ? new Date(detailGame.dateStarted).toLocaleDateString() : "Not started yet",
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: "Completed",
            value: detailGame.dateCompleted ? new Date(detailGame.dateCompleted).toLocaleDateString() : "Not completed",
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: "Price",
            value: detailGame.isGift ? "Gift" : `$${detailGame.price.toFixed(2)}`,
            icon: <DollarSign className="h-4 w-4" />
          },
        ] : []}
        secondaryFields={detailGame ? [
          {
            label: "Genres",
            value: detailGame.genres.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {detailGame.genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            ) : "No genres",
            fullWidth: true
          },
          {
            label: "Developer",
            value: detailGame.developer || "N/A",
          },
          {
            label: "Publisher",
            value: detailGame.publisher || "N/A",
          },
          {
            label: "Store",
            value: detailGame.store || "N/A",
          },
          {
            label: "Release Date",
            value: detailGame.releaseDate ? new Date(detailGame.releaseDate).toLocaleDateString() : "N/A",
          },
          {
            label: "$/Hour",
            value: detailGame.isGift ? "Gift" : `$${detailGame.pricePerHour.toFixed(2)}`,
          },
          {
            label: "Added",
            value: new Date(detailGame.createdAt).toLocaleDateString(),
          },
          {
            label: "Last Updated",
            value: new Date(detailGame.updatedAt).toLocaleDateString(),
          },
        ] : []}
        notes={detailGame?.notes}
        actions={detailGame ? [
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              handleEdit(detailGame)
              handleCloseDetailModal()
            },
            variant: "outline"
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: async () => {
              handleCloseDetailModal()
              await handleDelete(detailGame.id)
            },
            variant: "destructive"
          }
        ] : []}
      />

      {/* Add/Edit Game Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-3 sm:p-4 md:p-6 pb-3 sm:pb-4">
            <DialogTitle>
              {editingGame ? "Edit Game" : "Add New Game"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
            <GameEntryForm
              selectedGame={selectedGame}
              initialData={editingGame || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false)
                setSelectedGame(null)
                setEditingGame(null)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
