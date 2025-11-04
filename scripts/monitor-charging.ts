#!/usr/bin/env npx tsx
/**
 * Monitor the smart plug and automatically detect charging sessions
 * Saves energy usage to database when charging completes
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { TuyaAPI } from '../lib/tuya-api'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
})

const POLL_INTERVAL = 60000 // Check every minute
const CHARGING_THRESHOLD = 100 // Power > 100W means charging
const ELECTRICITY_RATE = 0.20 // $/kWh

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

  console.log(`[${new Date().toLocaleTimeString()}] Power: ${power}W | Cumulative: ${cumulativeKwh.toFixed(2)} kWh | ${isChargingNow ? '⚡ CHARGING' : '💤 IDLE'}`)

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

    if (state.startReading !== undefined) {
      const energyUsedKwh = (cumulativeRaw - state.startReading) / 100
      const cost = energyUsedKwh * ELECTRICITY_RATE
      const duration = Date.now() - (state.startTime?.getTime() || 0)
      const hours = duration / (1000 * 60 * 60)

      console.log(`  Duration: ${hours.toFixed(1)} hours`)
      console.log(`  Energy used: ${energyUsedKwh.toFixed(2)} kWh`)
      console.log(`  Cost: $${cost.toFixed(2)}`)
      console.log(`  Average power: ${(energyUsedKwh / hours * 1000).toFixed(0)}W`)

      // Save to database
      await saveToDatabase(energyUsedKwh, cost, state.startTime || new Date())
    }

    state = {
      isCharging: false,
      lastPower: power
    }

  } else if (wasCharging && isChargingNow) {
    // Still charging - show progress
    if (state.startReading !== undefined) {
      const energyUsedSoFar = (cumulativeRaw - state.startReading) / 100
      const costSoFar = energyUsedSoFar * ELECTRICITY_RATE
      if (energyUsedSoFar > 0.1) { // Only show if significant
        console.log(`  Progress: ${energyUsedSoFar.toFixed(2)} kWh ($${costSoFar.toFixed(2)})`)
      }
    }
    state.lastPower = power
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