"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { searchGames } from "@/lib/api/games"
import { GameSearchResult } from "@/types/game"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface GameSearchProps {
  onSelectGame: (game: GameSearchResult) => void
}

export function GameSearch({ onSelectGame }: GameSearchProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<GameSearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      const games = await searchGames(query)
      setResults(games)
      setIsOpen(true)
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (game: GameSearchResult) => {
    onSelectGame(game)
    setQuery("")
    setResults([])
    setIsOpen(false)
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for a game..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute z-50 mt-2 w-full">
          <ScrollArea className="h-[300px]">
            <CardContent className="p-2">
              {results.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleSelect(game)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-accent"
                >
                  {game.background_image && (
                    <img
                      src={game.background_image}
                      alt={game.name}
                      className="h-16 w-16 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium">{game.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {game.released} • {game.publishers?.[0]?.name || "Unknown"}
                    </p>
                  </div>
                </button>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      )}

      {isLoading && (
        <div className="absolute mt-2 w-full text-center text-sm text-muted-foreground">
          Searching...
        </div>
      )}
    </div>
  )
}
