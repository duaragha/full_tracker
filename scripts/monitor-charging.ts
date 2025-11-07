#!/usr/bin/env npx tsx
/**
 * Monitor the smart plug and automatically detect charging sessions
 * Saves energy usage to database when charging completes
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { TuyaAPI } from '../lib/tuya-api'
import { Pool } from 'pg'
import { getOntarioTOURate, calculateChargingCost, getCurrentTOUStatus } from '../lib/ontario-tou-rates'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
})

const POLL_INTERVAL = 30000 // Check every 30 seconds (better granularity)
const CHARGING_THRESHOLD = 100 // Power > 100W means charging
const MAX_RETRIES = 3 // Number of retries on API failure

interface ChargingState {
  isCharging: boolean
  startReading?: number
  startTime?: Date
  lastPower?: number
}

let state: ChargingState = {
  isCharging: false
}

async function checkAndUpdate() {
  let attempt = 0

  while (attempt < MAX_RETRIES) {
    try {
      const client = new TuyaAPI({
        clientId: process.env.TUYA_CLIENT_ID!,
        clientSecret: process.env.TUYA_CLIENT_SECRET!,
        deviceId: process.env.TUYA_DEVICE_ID!,
        dataCenter: process.env.TUYA_DATA_CENTER || 'us',
      })
      const status = await client.getDeviceStatus()

  const power = status.cur_power || 0
  const cumulativeRaw = status.add_ele || 0
  const cumulativeKwh = cumulativeRaw / 100
  const current = (status.cur_current || 0) / 1000 // Convert mA to A
  const voltage = (status.cur_voltage || 0) / 10 // Convert to V

  const wasCharging = state.isCharging
  const isChargingNow = power > CHARGING_THRESHOLD
  const touStatus = getCurrentTOUStatus()

  console.log(`[${new Date().toLocaleTimeString()}] Power: ${power}W | Cumulative: ${cumulativeKwh.toFixed(2)} kWh | ${isChargingNow ? '⚡ CHARGING' : '💤 IDLE'} | ${touStatus}`)

  if (!wasCharging && isChargingNow) {
    // Started charging
    console.log('🚗 Charging started!')
    console.log(`  Starting reading: ${cumulativeKwh.toFixed(2)} kWh`)
    console.log(`  Power: ${power}W`)
    console.log(`  Current: ${current.toFixed(1)}A @ ${voltage.toFixed(0)}V`)

    state = {
      isCharging: true,
      startReading: cumulativeRaw,
      startTime: new Date(),
      lastPower: power
    }

  } else if (wasCharging && !isChargingNow) {
    // Stopped charging
    console.log('✅ Charging completed!')

    if (state.startReading !== undefined && state.startTime) {
      const energyUsedKwh = (cumulativeRaw - state.startReading) / 100
      const endTime = new Date()
      const { cost, averageRate, breakdown } = calculateChargingCost(
        energyUsedKwh,
        state.startTime,
        endTime
      )
      const duration = endTime.getTime() - state.startTime.getTime()
      const hours = duration / (1000 * 60 * 60)

      console.log(`  Duration: ${hours.toFixed(1)} hours`)
      console.log(`  Energy used: ${energyUsedKwh.toFixed(2)} kWh`)
      console.log(`  Cost: $${cost.toFixed(2)}`)
      console.log(`  Rate: ${breakdown}`)
      console.log(`  Average power: ${(energyUsedKwh / hours * 1000).toFixed(0)}W`)

      // Save to database
      await saveToDatabase(energyUsedKwh, cost, state.startTime)
    }

    state = {
      isCharging: false,
      lastPower: power
    }

  } else if (wasCharging && isChargingNow) {
    // Still charging - show progress
    if (state.startReading !== undefined && state.startTime) {
      const energyUsedSoFar = (cumulativeRaw - state.startReading) / 100
      const { cost: costSoFar, breakdown } = calculateChargingCost(
        energyUsedSoFar,
        state.startTime,
        new Date()
      )
      if (energyUsedSoFar > 0.1) { // Only show if significant
        console.log(`  Progress: ${energyUsedSoFar.toFixed(2)} kWh ($${costSoFar.toFixed(2)}) - ${breakdown}`)
      }
    }
    state.lastPower = power
  }

      // Success - exit retry loop
      break
    } catch (error) {
      attempt++
      console.error(`⚠️  Attempt ${attempt}/${MAX_RETRIES} failed:`, error)

      if (attempt === MAX_RETRIES) {
        console.error('❌ Max retries reached, will try again next cycle')
      } else {
        // Wait 5 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }
}

async function saveToDatabase(energyKwh: number, cost: number, startTime: Date) {
  const date = startTime.toISOString().split('T')[0]

  try {
    // Check if we already have data for this date
    const existing = await pool.query(
      'SELECT energy_kwh FROM phev_tracker WHERE date = $1',
      [date]
    )

    if (existing.rows.length > 0) {
      // Add to existing
      await pool.query(
        `UPDATE phev_tracker
         SET energy_kwh = energy_kwh + $2,
             cost = cost + $3,
             notes = CONCAT(notes, ' | Auto-added: ', $4, ' kWh')
         WHERE date = $1`,
        [date, energyKwh, cost, energyKwh.toFixed(2)]
      )
      console.log(`📊 Added ${energyKwh.toFixed(2)} kWh to existing entry for ${date}`)
    } else {
      // Create new entry
      await pool.query(
        `INSERT INTO phev_tracker (date, energy_kwh, cost, notes, km_driven)
         VALUES ($1, $2, $3, $4, 0)`,
        [date, energyKwh, cost, `Auto-tracked charging session: ${energyKwh.toFixed(2)} kWh`]
      )
      console.log(`📊 Created new entry for ${date}`)
    }

    console.log('✅ Saved to database!')
  } catch (error) {
    console.error('❌ Database error:', error)
  }
}

async function main() {
  console.log('🔌 Tuya Charging Monitor')
  console.log('Monitoring your smart plug for charging sessions...')
  console.log('Press Ctrl+C to stop\n')

  // Initial check
  await checkAndUpdate()

  // Set up interval
  const interval = setInterval(checkAndUpdate, POLL_INTERVAL)

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Stopping monitor...')
    clearInterval(interval)

    if (state.isCharging && state.startReading !== undefined) {
      console.log('⚠️  Warning: Charging session still in progress')
      console.log('Run the monitor again to continue tracking')
    }

    await pool.end()
    process.exit(0)
  })
}

main().catch(console.error)