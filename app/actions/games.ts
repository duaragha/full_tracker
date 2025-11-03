'use server'

import { Game } from '@/types/game'
import { getGames, addGame, updateGame, deleteGame, calculateTotalDays, calculateTotalHours, calculateAveragePercentage } from '@/lib/db/games-store'
import { invalidateStatsCache } from '@/lib/cache/stats-cache'

export async function getGamesAction() {
  return await getGames()
}

export async function addGameAction(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) {
  const result = await addGame(game)
  // Invalidate stats cache after adding new game
  invalidateStatsCache()
  return result
}

export async function updateGameAction(id: number, game: Partial<Game>) {
  await updateGame(id, game)
  // Invalidate stats cache after updating game
  invalidateStatsCache()
}

export async function deleteGameAction(id: number) {
  await deleteGame(id)
  // Invalidate stats cache after deleting game
  invalidateStatsCache()
}

export async function getGamesStatsAction() {
  const games = await getGames()
  return {
    totalDays: calculateTotalDays(games),
    totalHours: calculateTotalHours(games),
    avgPercentage: calculateAveragePercentage(games),
  }
}

export async function enrichGamesWithRAWGDataAction() {
  const { searchGameByTitle } = await import('@/lib/api/games')
  const games = await getGames()

  const results = {
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const game of games) {
    // Skip if game already has all data
    if (game.developer && game.genres?.length > 0 && game.coverImage) {
      results.skipped++
      continue
    }

    try {
      // Search for game on RAWG
      const rawgData = await searchGameByTitle(game.title)

      if (!rawgData) {
        results.failed++
        results.errors.push(`No match found for "${game.title}"`)
        continue
      }

      // Update game with missing data
      const updates: Partial<Game> = {}

      if (!game.developer && rawgData.developers?.length > 0) {
        updates.developer = rawgData.developers[0].name
      }

      if (!game.genres?.length && rawgData.genres?.length > 0) {
        updates.genres = rawgData.genres.map((g: any) => g.name)
      }

      if (!game.coverImage && rawgData.background_image) {
        updates.coverImage = rawgData.background_image
      }

      if (Object.keys(updates).length > 0) {
        await updateGame(Number(game.id), updates)
        results.updated++
      } else {
        results.skipped++
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 350))
    } catch (error) {
      results.failed++
      results.errors.push(`Failed to enrich "${game.title}": ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Invalidate stats cache after bulk update
  if (results.updated > 0) {
    invalidateStatsCache()
  }

  return results
}
