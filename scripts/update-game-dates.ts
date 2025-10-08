import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

const gameDates: Record<string, { started?: string; completed?: string }> = {
  "Assassin's Creed 3": { started: '2015-06-28', completed: '2016-09-23' },
  "Assassin's Creed 4: Black Flag": { started: '2015-06-26', completed: '2016-09-11' },
  "Assassin's Creed Rouge": { started: '2024-08-09', completed: '2024-09-24' },
  "Assassin's Creed Odyessy": { started: '2019-02-11', completed: '2019-10-17' },
  "Assassin's Creed Valhalla": { started: '2021-01-15' },
  "Assassin's Creed Shadows": { started: '2025-04-01', completed: '2025-06-21' },
  "Cyberpunk 2077": { started: '2024-03-13', completed: '2024-08-08' },
  "Days Gone": { started: '2025-06-27' },
  "Dishonored": { started: '2016-07-01', completed: '2016-07-27' },
  "Dishonored 2": { started: '2025-02-18' },
  "Eldin Ring": { started: '2025-06-28' },
  "Far Cry 3": { started: '2015-08-26', completed: '2015-10-01' },
  "Far Cry 4": { started: '2017-03-07', completed: '2018-09-04' },
  "Far Cry Primal": { started: '2017-03-07', completed: '2018-08-20' },
  "Far Cry 5": { started: '2019-12-25', completed: '2020-04-20' },
  "Far Cry New Dawn": { started: '2020-04-20', completed: '2020-05-22' },
  "Forza Horizon 5": { started: '2021-11-08' },
  "Ghosts of Tsushima": { started: '2024-04-13', completed: '2024-06-28' },
  "Grand Theft Auto IV": { started: '2025-09-26' },
  "Horizon Zero Dawn: Complete Edition": { started: '2021-06-04', completed: '2022-04-11' },
  "Horizon Forbidden West": { started: '2022-09-08', completed: '2023-05-10' },
  "Mad Max": { started: '2017-10-03', completed: '2018-05-26' },
  "Marvel's Spider Man (2018)": { started: '2021-07-30', completed: '2022-04-12' },
  "Marvel's Spider Man: Miles Morales": { started: '2021-08-30', completed: '2022-04-21' },
  "Marvel's Spider Man 2": { started: '2023-11-15', completed: '2024-01-24' },
  "Middle-Earth: Shadow of Mordor": { started: '2017-04-25', completed: '2017-05-14' },
  "Middle-Earth: Shadow of War": { started: '2019-01-13', completed: '2019-02-11' },
  "Red Dead Redemption 2": { started: '2023-12-02', completed: '2024-04-21' },
  "The Elder Scrolls V: Skyrim": { started: '2015-01-01', completed: '2015-07-23' },
  "The Legend of Zelda: Skyward Sword HD": { started: '2021-08-01', completed: '2022-06-28' },
  "The Legend of Zelda: Tears of the Kingdom": { started: '2023-05-12', completed: '2024-09-20' },
  "The Witcher 3: Wild Hunt NG": { started: '2022-12-15', completed: '2023-12-18' },
  "Tomb Raider": { started: '2016-06-30', completed: '2016-07-15' },
  "Rise of the Tomb Raider": { started: '2017-06-04', completed: '2017-08-04' },
  "Watch Dogs 2": { started: '2018-05-02', completed: '2018-08-01' },
  "Watch Dogs Legion": { started: '2024-10-11', completed: '2025-02-16' },
}

async function updateGameDates() {
  let updated = 0
  let notFound = 0

  for (const [title, dates] of Object.entries(gameDates)) {
    try {
      // Find game by title (case insensitive)
      const result = await pool.query(
        'SELECT id FROM games WHERE LOWER(title) = LOWER($1)',
        [title]
      )

      if (result.rows.length > 0) {
        const gameId = result.rows[0].id
        await pool.query(
          'UPDATE games SET started_date = $1, completed_date = $2, updated_at = NOW() WHERE id = $3',
          [dates.started || null, dates.completed || null, gameId]
        )
        console.log(`✓ Updated: ${title}`)
        updated++
      } else {
        console.log(`✗ Not found: ${title}`)
        notFound++
      }
    } catch (error) {
      console.error(`✗ Error updating ${title}:`, error)
    }
  }

  console.log(`\n✓ Updated ${updated} games`)
  console.log(`✗ Not found: ${notFound} games`)

  await pool.end()
}

updateGameDates()
