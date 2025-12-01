import { getGamesAction } from "@/app/actions/games"
import { getBooksAction } from "@/app/actions/books"
import { getTVShowsAction } from "@/app/actions/tvshows"
import { getMoviesAction } from "@/app/actions/movies"
import { getPHEVStatsAction, getPHEVCarSummariesAction } from "@/app/actions/phev"
import { getInventoryItemsAction } from "@/app/actions/inventory"
import { getJobStatsAction } from "@/app/actions/jobs"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default async function DashboardPage() {
  const [
    games,
    books,
    tvshows,
    movies,
    inventory,
    phevStats,
    phevCarSummaries,
    jobStats
  ] = await Promise.all([
    getGamesAction(),
    getBooksAction(),
    getTVShowsAction(),
    getMoviesAction(),
    getInventoryItemsAction(),
    getPHEVStatsAction(),
    getPHEVCarSummariesAction(),
    getJobStatsAction()
  ])

  return (
    <DashboardContent
      initialGames={games}
      initialBooks={books}
      initialTVShows={tvshows}
      initialMovies={movies}
      initialInventory={inventory}
      initialPHEVStats={phevStats}
      initialPHEVCarSummaries={phevCarSummaries}
      initialJobStats={jobStats}
    />
  )
}
