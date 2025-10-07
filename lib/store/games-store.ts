import { Game } from '@/types/game'

const STORAGE_KEY = 'full_tracker_games'

export function getGames(): Game[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading games:', error)
    return []
  }
}

export function saveGames(games: Game[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
  } catch (error) {
    console.error('Error saving games:', error)
  }
}

export function addGame(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Game {
  const games = getGames()
  const newGame: Game = {
    ...game,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  games.push(newGame)
  saveGames(games)
  return newGame
}

export function updateGame(id: string, updates: Partial<Game>): Game | null {
  const games = getGames()
  const index = games.findIndex(g => g.id === id)

  if (index === -1) return null

  games[index] = {
    ...games[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  saveGames(games)
  return games[index]
}

export function deleteGame(id: string): boolean {
  const games = getGames()
  const filtered = games.filter(g => g.id !== id)

  if (filtered.length === games.length) return false

  saveGames(filtered)
  return true
}

export function calculateTotalDays(games: Game[]): number {
  return games.reduce((total, game) => total + game.daysPlayed, 0)
}

export function calculateTotalHours(games: Game[]): number {
  return games.reduce((total, game) => {
    const hours = game.hoursPlayed || 0
    const minutes = game.minutesPlayed || 0
    return total + hours + (minutes / 60)
  }, 0)
}

export function calculateAveragePercentage(games: Game[]): number {
  if (games.length === 0) return 0
  const total = games.reduce((sum, game) => sum + (game.percentage || 0), 0)
  return Math.round(total / games.length)
}
