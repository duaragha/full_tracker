'use server'

import { Game } from '@/types/game'
import { getGames, addGame, updateGame, deleteGame, calculateTotalDays, calculateTotalHours, calculateAveragePercentage } from '@/lib/db/games-store'

export async function getGamesAction() {
  return await getGames()
}

export async function addGameAction(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) {
  return await addGame(game)
}

export async function updateGameAction(id: number, game: Partial<Game>) {
  return await updateGame(id, game)
}

export async function deleteGameAction(id: number) {
  return await deleteGame(id)
}

export async function getGamesStatsAction() {
  const games = await getGames()
  return {
    totalDays: calculateTotalDays(games),
    totalHours: calculateTotalHours(games),
    avgPercentage: calculateAveragePercentage(games),
  }
}
