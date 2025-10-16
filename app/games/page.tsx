"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, Download } from "lucide-react"
import { Game, GameSearchResult } from "@/types/game"
import { getGamesAction, addGameAction, updateGameAction, deleteGameAction, enrichGamesWithRAWGDataAction } from "@/app/actions/games"
import { getGameDetails } from "@/lib/api/games"
import { GameSearch } from "@/components/game-search"
import { GameEntryForm } from "@/components/game-entry-form"
import { GameTableRow } from "@/components/game-table-row"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function GamesPage() {
  const [games, setGames] = React.useState<Game[]>([])
  const [selectedGame, setSelectedGame] = React.useState<GameSearchResult | null>(null)
  const [editingGame, setEditingGame] = React.useState<Game | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<string>("All")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"title" | "progress" | "hours" | "days">("title")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")
  const [isEnriching, setIsEnriching] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState<number>(20)

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
      const enhancedGame = {
        ...game,
        developers: fullDetails.developers,
        genres: fullDetails.genres,
      }
      setSelectedGame(enhancedGame as any)
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

  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'Playing': return 'default'
      case 'Completed': return 'secondary'
      case 'Stopped': return 'destructive'
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

      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-7">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-2xl sm:text-3xl">{games.length}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total Games</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-2xl sm:text-3xl">{totalHours.toFixed(1)}h</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total Hours Played</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-2xl sm:text-3xl">{avgPercentage}%</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Average Percentage</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-2xl sm:text-3xl">{totalDays}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total Days</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-2xl sm:text-3xl">${totalCost.toFixed(2)}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total Cost</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base truncate">
              {oldestGame ? oldestGame.title : 'N/A'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Oldest Game {oldestGame && `(${new Date(oldestGame.dateStarted).getFullYear()})`}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base truncate">
              {newestGame ? newestGame.title : 'N/A'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Newest Game {newestGame && `(${new Date(newestGame.dateStarted).getFullYear()})`}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Search for a Game</CardTitle>
            <CardDescription>Find games from the RAWG database</CardDescription>
          </CardHeader>
          <CardContent>
            <GameSearch onSelectGame={handleGameSelect} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Your Games</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4" suppressHydrationWarning>
              <Input
                placeholder="Search games by title..."
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
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="hours">Hours Played</SelectItem>
                  <SelectItem value="days">Days Played</SelectItem>
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
          {filteredAndSortedGames.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No games found. Start adding games to track your progress!
            </div>
          ) : (
            <>
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
                    {paginatedGames.map((game) => (
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
                {paginatedGames.map((game) => (
                  <Card key={game.id} className="overflow-hidden">
                    <div className="flex gap-4 p-4">
                      {game.coverImage && (
                        <img
                          src={game.coverImage}
                          alt={game.title}
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
            </>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-3xl h-[90vh] flex flex-col p-0 gap-0 sm:h-auto sm:max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-4">
            <DialogTitle>
              {editingGame ? "Edit Game" : "Add New Game"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-4 sm:px-6">
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
