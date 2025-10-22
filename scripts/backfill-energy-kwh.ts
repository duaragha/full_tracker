import { Pool } from 'pg'
import { createTuyaClient } from '../lib/tuya-api'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

interface Entry {
  id: number
  date: string
  cost: number
  km_driven: number
  energy_kwh: number | null
}

async function backfillEnergyData() {
  try {
    console.log('🔍 Fetching entries with missing energy_kwh data...\n')

    // Get all entries where energy_kwh is NULL
    const result = await pool.query<Entry>(
      'SELECT id, date, cost, km_driven, energy_kwh FROM phev_tracker WHERE energy_kwh IS NULL ORDER BY date ASC'
    )

    const entries = result.rows

    if (entries.length === 0) {
      console.log('✅ All entries already have energy data!')
      return
    }

    console.log(`📊 Found ${entries.length} entries to backfill\n`)

    // Create Tuya client
    const tuyaClient = createTuyaClient()

    let successCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Process each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const progress = `[${i + 1}/${entries.length}]`

      try {
        console.log(`${progress} Processing ${entry.date}...`)

        // Fetch energy data from Tuya for this date
        const energyKwh = await tuyaClient.getEnergyForDate(entry.date)

        if (energyKwh > 0) {
          // Update the entry with the fetched energy data
          await pool.query(
            'UPDATE phev_tracker SET energy_kwh = $1 WHERE id = $2',
            [energyKwh, entry.id]
          )

          console.log(`  ✓ Updated: ${energyKwh.toFixed(3)} kWh`)
          successCount++
        } else {
          console.log(`  ⊘ Skipped: No energy data found for this date`)
          skippedCount++
        }

        // Add a small delay to avoid rate limiting (Tuya typically allows 100 req/sec)
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.log(`  ✗ Error: ${errorMessage}`)
        errorCount++

        // Continue processing other entries even if one fails
        continue
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 Backfill Summary:')
    console.log(`   ✅ Successfully updated: ${successCount}`)
    console.log(`   ⊘ Skipped (no data):     ${skippedCount}`)
    console.log(`   ✗ Errors:               ${errorCount}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Fatal error during backfill:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the backfill
console.log('🚀 Starting PHEV Energy Data Backfill\n')
backfillEnergyData()
  .then(() => {
    console.log('\n✨ Backfill complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Backfill failed:', error)
    process.exit(1)
  })
