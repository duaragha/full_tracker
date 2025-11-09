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
import { writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
})

const POLL_INTERVAL = 30000 // Check every 30 seconds (better granularity)
const CHARGING_THRESHOLD = 100 // Power > 100W means charging
const MAX_RETRIES = 3 // Number of retries on API failure
const STATE_FILE = '/tmp/tuya-monitor-state.json' // Persist state across restarts

interface ChargingState {
  isCharging: boolean
  startReading?: number
  startTime?: string // Store as ISO string for JSON serialization
  lastPower?: number
}

let state: ChargingState = {
  isCharging: false
}

// Load state from disk
async function loadState(): Promise<ChargingState> {
  try {
    if (existsSync(STATE_FILE)) {
      const data = await readFile(STATE_FILE, 'utf-8')
      const loaded = JSON.parse(data)
      console.log('✅ Loaded previous state:', loaded)
      return loaded
    }
  } catch (error) {
    console.warn('⚠️  Failed to load state file:', error)
  }
  return { isCharging: false }
}

// Save state to disk
async function saveState(newState: ChargingState): Promise<void> {
  try {
    await writeFile(STATE_FILE, JSON.stringify(newState, null, 2), 'utf-8')
  } catch (error) {
    console.error('❌ Failed to save state:', error)
  }
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
  const currentRate = getOntarioTOURate()
  const cumulativeCost = cumulativeKwh * currentRate.rate
  const touStatus = getCurrentTOUStatus()

  console.log(`[${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Toronto' })}] Power: ${power}W | Energy: ${cumulativeKwh.toFixed(2)} kWh ($${cumulativeCost.toFixed(2)}) | ${isChargingNow ? '⚡ CHARGING' : '💤 IDLE'} | ${touStatus}`)

  if (!wasCharging && isChargingNow) {
    // Started charging
    console.log('🚗 Charging started!')
    console.log(`  Starting reading: ${cumulativeKwh.toFixed(2)} kWh`)
    console.log(`  Power: ${power}W`)
    console.log(`  Current: ${current.toFixed(1)}A @ ${voltage.toFixed(0)}V`)

    state = {
      isCharging: true,
      startReading: cumulativeRaw,
      startTime: new Date().toISOString(),
      lastPower: power
    }
    await saveState(state)

  } else if (wasCharging && !isChargingNow) {
    // Stopped charging
    console.log('✅ Charging completed!')

    if (state.startReading !== undefined && state.startTime) {
      const energyUsedKwh = (cumulativeRaw - state.startReading) / 100
      const startTime = new Date(state.startTime)
      const endTime = new Date()
      const { cost, averageRate, breakdown } = calculateChargingCost(
        energyUsedKwh,
        startTime,
        endTime
      )
      const duration = endTime.getTime() - startTime.getTime()
      const hours = duration / (1000 * 60 * 60)

      console.log(`  Duration: ${hours.toFixed(1)} hours`)
      console.log(`  Energy used: ${energyUsedKwh.toFixed(2)} kWh`)
      console.log(`  Cost: $${cost.toFixed(2)}`)
      console.log(`  Rate: ${breakdown}`)
      console.log(`  Average power: ${(energyUsedKwh / hours * 1000).toFixed(0)}W`)

      // Save to database
      await saveToDatabase(energyUsedKwh, cost, startTime)
    }

    state = {
      isCharging: false,
      lastPower: power
    }
    await saveState(state)

  } else if (wasCharging && isChargingNow) {
    // Still charging - show progress
    if (state.startReading !== undefined && state.startTime) {
      const energyUsedSoFar = (cumulativeRaw - state.startReading) / 100
      const startTime = new Date(state.startTime)
      const { cost: costSoFar, breakdown } = calculateChargingCost(
        energyUsedSoFar,
        startTime,
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

  // Load previous state (crash recovery)
  state = await loadState()

  // Verify state by checking current device status
  if (state.isCharging) {
    console.log('⚠️  Detected previous charging session in progress')
    console.log('⚠️  Attempting crash recovery...')

    try {
      const client = new TuyaAPI({
        clientId: process.env.TUYA_CLIENT_ID!,
        clientSecret: process.env.TUYA_CLIENT_SECRET!,
        deviceId: process.env.TUYA_DEVICE_ID!,
        dataCenter: process.env.TUYA_DATA_CENTER || 'us',
      })
      const status = await client.getDeviceStatus()
      const isCurrentlyCharging = (status.cur_power || 0) > CHARGING_THRESHOLD

      if (!isCurrentlyCharging) {
        console.log('⚠️  Car is no longer charging - previous session ended during crash')
        console.log('⚠️  Session data lost - resetting state')
        state = { isCharging: false }
        await saveState(state)
      } else {
        console.log('✅ Car still charging - continuing from saved state')
        console.log(`   Started at: ${state.startTime}`)
        console.log(`   Starting reading: ${((state.startReading || 0) / 100).toFixed(2)} kWh`)
      }
    } catch (error) {
      console.error('❌ Failed to verify state:', error)
      console.log('⚠️  Resetting to safe state')
      state = { isCharging: false }
      await saveState(state)
    }
  }

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