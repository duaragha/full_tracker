"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, Download } from "lucide-react"
import { Game, GameSearchResult } from "@/types/game"
import { getGamesAction, addGameAction, updateGameAction, deleteGameAction, bulkImportGamesAction, enrichGamesWithRAWGDataAction } from "@/app/actions/games"
import { getGameDetails } from "@/lib/api/games"
import { GameSearch } from "@/components/game-search"
import { GameEntryForm } from "@/components/game-entry-form"
import { GamesExcelUpload } from "@/components/games-excel-upload"
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

  const handleBulkImport = async (gamesToImport: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const results = await bulkImportGamesAction(gamesToImport)

    if (results.errors.length > 0) {
      alert(`Import completed with errors:\n${results.success} succeeded, ${results.failed} failed\n\n${results.errors.join('\n')}`)
    } else {
      alert(`Successfully imported ${results.success} games!`)
    }

    const data = await getGamesAction()
    setGames(data)
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

  const totalDays = games.reduce((sum, g) => sum + g.daysPlayed, 0)
  const totalHours = games.reduce((sum, g) => sum + g.hoursPlayed + g.minutesPlayed / 60, 0)
  const avgPercentage = games.length > 0 ? Math.round(games.reduce((sum, g) => sum + g.percentage, 0) / games.length) : 0

  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'Playing': return 'default'
      case 'Completed': return 'secondary'
      case 'Stopped': return 'destructive'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Games Tracker</h1>
          <p className="text-muted-foreground">Track your gaming journey</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleEnrichGames}
            disabled={isEnriching || games.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isEnriching ? 'Enriching...' : 'Enrich Missing Data'}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Game Manually
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{games.length}</CardTitle>
            <CardDescription>Total Games</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{totalHours.toFixed(1)}h</CardTitle>
            <CardDescription>Total Hours Played</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{avgPercentage}%</CardTitle>
            <CardDescription>Average Percentage</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{totalDays}</CardTitle>
            <CardDescription>Total Days</CardDescription>
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

        <GamesExcelUpload onImport={handleBulkImport} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle>Your Games</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
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
            <div className="flex gap-4">
              <Input
                placeholder="Search games by title..."
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
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="hours">Hours Played</SelectItem>
                  <SelectItem value="days">Days Played</SelectItem>
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
          {filteredAndSortedGames.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No games found. Start adding games to track your progress!
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    <TableHead>$/Hour</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedGames.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        {game.coverImage && (
                          <img
                            src={game.coverImage}
                            alt={game.title}
                            className="h-12 w-12 rounded object-cover"
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{game.title}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(game.status)}>
                          {game.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{game.percentage}%</TableCell>
                      <TableCell>{game.hoursPlayed}h {game.minutesPlayed}m</TableCell>
                      <TableCell>{game.daysPlayed}</TableCell>
                      <TableCell>{game.console}</TableCell>
                      <TableCell>${game.price.toFixed(2)}</TableCell>
                      <TableCell>${game.pricePerHour.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(game)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(game.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
              {editingGame ? "Edit Game" : "Add New Game"}
            </DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
