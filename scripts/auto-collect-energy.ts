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

/**
 * Auto-collect energy data for yesterday's charging session
 * This script is designed to be run daily via cron/scheduler
 */
async function autoCollectEnergy() {
  console.log('='.repeat(70))
  console.log('TUYA AUTO-COLLECT - Daily Energy Data Collection')
  console.log('='.repeat(70))
  console.log()

  try {
    // Get yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    console.log(`Collecting energy data for: ${dateStr}`)
    console.log()

    // Create Tuya client
    const tuyaClient = createTuyaClient()

    // Check if entry already exists for this date
    const existingEntry = await pool.query(
      'SELECT id, energy_kwh, cost FROM phev_tracker WHERE date = $1',
      [dateStr]
    )

    if (existingEntry.rows.length > 0) {
      const entry = existingEntry.rows[0]
      console.log(`Entry already exists for ${dateStr}:`)
      console.log(`  ID: ${entry.id}`)
      console.log(`  Energy: ${entry.energy_kwh || 'NULL'} kWh`)
      console.log(`  Cost: $${entry.cost || 0}`)
      console.log()

      // Ask if we should update it
      if (entry.energy_kwh === null) {
        console.log('Energy data is missing. Attempting to fetch from Tuya...')
      } else {
        console.log('Energy data already exists. Skipping auto-collection.')
        console.log('To force update, manually delete the entry and run this script again.')
        return
      }
    } else {
      console.log(`No entry exists for ${dateStr}`)
      console.log('Auto-collection will only fetch data, not create entries.')
      console.log('User must create entries manually in the PHEV Tracker.')
      console.log()
      return
    }

    // Fetch energy data from Tuya
    console.log('Fetching energy data from Tuya API...')
    const energyData = await tuyaClient.getEnergyDataForDate(dateStr)

    console.log('Result:')
    console.log(`  Energy: ${energyData.energy_kwh.toFixed(3)} kWh`)
    console.log(`  Cost: $${energyData.cost.toFixed(2)}`)
    console.log(`  Source: ${energyData.source}`)
    console.log(`  Confidence: ${energyData.confidence}`)
    console.log(`  Message: ${energyData.message}`)
    console.log()

    if (energyData.energy_kwh > 0 && energyData.confidence !== 'low') {
      // Update the entry with fetched data
      await pool.query(
        'UPDATE phev_tracker SET energy_kwh = $1, cost = $2 WHERE date = $3',
        [energyData.energy_kwh, energyData.cost, dateStr]
      )

      console.log('✓ Successfully updated entry with energy data!')
      console.log()
    } else {
      console.log('⚠ No reliable energy data available.')
      console.log('Entry will remain unchanged. User should enter data manually.')
      console.log()
    }

  } catch (error) {
    console.error('✗ Error during auto-collection:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }

  console.log('='.repeat(70))
}

/**
 * Alternative: Monitor charging session and create entry automatically
 * This is more advanced and requires real-time monitoring
 */
async function monitorAndCollect() {
  console.log('Starting real-time charging monitor...')
  console.log('This will monitor the smart plug and detect charging sessions.')
  console.log('Press Ctrl+C to stop.')
  console.log()

  const tuyaClient = createTuyaClient()
  let isCurrentlyCharging = false
  let chargingStartTime: Date | null = null
  let chargingStartEnergy: number | null = null

  // Monitor every 30 seconds
  setInterval(async () => {
    try {
      const session = await tuyaClient.monitorChargingSession()
      const cumulativeEnergy = await tuyaClient.getCumulativeEnergy()

      const now = new Date()
      console.log(`[${now.toISOString()}] Power: ${session.currentPower}W, Switch: ${session.switchState ? 'ON' : 'OFF'}`)

      // Detect charging start
      if (session.isCharging && !isCurrentlyCharging) {
        console.log('🔌 CHARGING STARTED!')
        isCurrentlyCharging = true
        chargingStartTime = now
        chargingStartEnergy = cumulativeEnergy
      }

      // Detect charging stop
      if (!session.isCharging && isCurrentlyCharging && chargingStartTime) {
        console.log('⚡ CHARGING STOPPED!')
        const duration = (now.getTime() - chargingStartTime.getTime()) / 1000 / 60 // minutes
        console.log(`Duration: ${duration.toFixed(1)} minutes`)

        if (cumulativeEnergy !== null && chargingStartEnergy !== null) {
          const energyUsed = cumulativeEnergy - chargingStartEnergy
          console.log(`Energy used: ${energyUsed} (raw units - needs conversion)`)
        }

        console.log('You should now create an entry in PHEV Tracker for this charging session.')
        console.log()

        isCurrentlyCharging = false
        chargingStartTime = null
        chargingStartEnergy = null
      }

    } catch (error) {
      console.error('Error monitoring session:', error)
    }
  }, 30000) // Check every 30 seconds
}

// Main execution
const args = process.argv.slice(2)

if (args.includes('--monitor')) {
  console.log('Running in monitor mode...')
  monitorAndCollect()
} else {
  console.log('Running in auto-collect mode...')
  autoCollectEnergy()
    .then(() => {
      console.log('Auto-collection complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Auto-collection failed:', error)
      process.exit(1)
    })
}
