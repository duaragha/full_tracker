#!/usr/bin/env npx tsx
/**
 * Track a charging session by recording cumulative energy before and after
 * Since Energy Management API isn't available, we use the cumulative counter
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

interface ChargingSession {
  start_reading: number
  end_reading: number
  start_time: Date
  end_time: Date
  energy_used_kwh: number
  cost: number
}

async function getCurrentReading() {
  const client = new TuyaAPI({
    clientId: process.env.TUYA_CLIENT_ID!,
    clientSecret: process.env.TUYA_CLIENT_SECRET!,
    deviceId: process.env.TUYA_DEVICE_ID!,
    dataCenter: process.env.TUYA_DATA_CENTER || 'us',
  })
  const status = await client.getDeviceStatus()

  // add_ele is cumulative energy in 0.01 kWh units
  const raw = status.add_ele || 0
  const kwh = raw / 100

  return {
    raw,
    kwh,
    timestamp: new Date(),
    power_w: status.cur_power || 0,
    current_ma: status.cur_current || 0,
    voltage_v: (status.cur_voltage || 0) / 10, // Voltage is in 0.1V units
  }
}

async function startSession() {
  const reading = await getCurrentReading()
  const touStatus = getCurrentTOUStatus()

  console.log('🔋 Starting charging session tracking')
  console.log(`  Initial reading: ${reading.kwh.toFixed(2)} kWh (raw: ${reading.raw})`)
  console.log(`  Power: ${reading.power_w}W`)
  console.log(`  Voltage: ${reading.voltage_v.toFixed(1)}V`)
  console.log(`  Current: ${reading.current_ma}mA`)
  console.log(`  Electricity Rate: ${touStatus}`)

  // Save to a temp file or database
  const fs = await import('fs')
  fs.writeFileSync('.charging-session.json', JSON.stringify({
    start: reading,
    status: 'charging'
  }))

  console.log('\n✅ Session tracking started!')
  console.log('Run this command again with --end when charging is complete')
}

async function endSession() {
  const fs = await import('fs')

  if (!fs.existsSync('.charging-session.json')) {
    console.error('❌ No active charging session found')
    console.log('Start a session first with: npx tsx scripts/track-charging-session.ts --start')
    return
  }

  const session = JSON.parse(fs.readFileSync('.charging-session.json', 'utf-8'))
  const endReading = await getCurrentReading()

  console.log('🔋 Ending charging session')
  console.log(`  Final reading: ${endReading.kwh.toFixed(2)} kWh (raw: ${endReading.raw})`)

  // Calculate energy used and cost with TOU rates
  const energyUsed = endReading.kwh - session.start.kwh
  const startTime = new Date(session.start.timestamp)
  const endTime = endReading.timestamp
  const { cost, averageRate, breakdown } = calculateChargingCost(
    energyUsed,
    startTime,
    endTime
  )

  console.log('\n📊 Session Summary:')
  console.log(`  Start: ${session.start.kwh.toFixed(2)} kWh`)
  console.log(`  End: ${endReading.kwh.toFixed(2)} kWh`)
  console.log(`  Energy Used: ${energyUsed.toFixed(2)} kWh`)
  console.log(`  Cost: $${cost.toFixed(2)}`)
  console.log(`  Rate: ${breakdown}`)
  console.log(`  Duration: ${calculateDuration(session.start.timestamp, endTime)}`)

  // Save to database
  const date = new Date().toISOString().split('T')[0]
  console.log(`\n💾 Saving to database for ${date}...`)

  try {
    await pool.query(
      `INSERT INTO phev_tracker (date, energy_kwh, cost, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (date)
       DO UPDATE SET energy_kwh = $2, cost = $3, notes = $4`,
      [date, energyUsed, cost, `Auto-tracked: ${session.start.raw} → ${endReading.raw}`]
    )
    console.log('✅ Saved to database!')
  } catch (error) {
    console.error('❌ Failed to save to database:', error)
  }

  // Clean up
  fs.unlinkSync('.charging-session.json')
}

async function checkStatus() {
  const reading = await getCurrentReading()
  const fs = await import('fs')
  const touStatus = getCurrentTOUStatus()

  console.log('📊 Current Status:')
  console.log(`  Cumulative Energy: ${reading.kwh.toFixed(2)} kWh`)
  console.log(`  Power: ${reading.power_w}W ${reading.power_w > 100 ? '⚡ CHARGING' : '💤 IDLE'}`)
  console.log(`  Voltage: ${reading.voltage_v.toFixed(1)}V`)
  console.log(`  Current: ${(reading.current_ma / 1000).toFixed(1)}A`)
  console.log(`  Current Rate: ${touStatus}`)

  if (fs.existsSync('.charging-session.json')) {
    const session = JSON.parse(fs.readFileSync('.charging-session.json', 'utf-8'))
    const energyUsed = reading.kwh - session.start.kwh
    const startTime = new Date(session.start.timestamp)
    const { cost, breakdown } = calculateChargingCost(energyUsed, startTime, new Date())
    console.log(`\n  Active Session:`)
    console.log(`    Energy used so far: ${energyUsed.toFixed(2)} kWh`)
    console.log(`    Cost so far: $${cost.toFixed(2)} (${breakdown})`)
  }
}

function calculateDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

// Main
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--start')) {
    await startSession()
  } else if (args.includes('--end')) {
    await endSession()
  } else if (args.includes('--status')) {
    await checkStatus()
  } else {
    console.log('🔌 Tuya Charging Session Tracker')
    console.log('\nUsage:')
    console.log('  --start   Start tracking a charging session')
    console.log('  --end     End tracking and calculate energy used')
    console.log('  --status  Check current status')
    console.log('\nExample workflow:')
    console.log('  1. npx tsx scripts/track-charging-session.ts --start')
    console.log('  2. Plug in and charge your car')
    console.log('  3. npx tsx scripts/track-charging-session.ts --end')
  }

  await pool.end()
}

main().catch(console.error)