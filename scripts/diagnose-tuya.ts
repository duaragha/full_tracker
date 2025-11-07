import { createTuyaClient } from '../lib/tuya-api'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function runDiagnostics() {
  console.log('='.repeat(70))
  console.log('TUYA SMART PLUG - DIAGNOSTIC REPORT')
  console.log('='.repeat(70))
  console.log()

  console.log('Configuration:')
  console.log(`  Client ID:     ${process.env.TUYA_CLIENT_ID || 'NOT SET'}`)
  console.log(`  Device ID:     ${process.env.TUYA_DEVICE_ID || 'NOT SET'}`)
  console.log(`  Data Center:   ${process.env.TUYA_DATA_CENTER || 'NOT SET (defaulting to US)'}`)
  console.log(`  Client Secret: ${process.env.TUYA_CLIENT_SECRET ? '[CONFIGURED]' : 'NOT SET'}`)
  console.log()

  try {
    const client = createTuyaClient()

    console.log('Running diagnostic tests...')
    console.log()

    // Run comprehensive diagnostics
    const results = await client.runDiagnostics()

    // Display results
    console.log('DIAGNOSTIC RESULTS:')
    console.log('-'.repeat(70))
    console.log(`✓ Authentication:        ${results.authentication ? 'PASS' : 'FAIL'}`)
    console.log(`✓ Device Status API:     ${results.deviceStatus ? 'PASS' : 'FAIL'}`)
    console.log(`✓ Energy Management API: ${results.energyAPI ? 'PASS' : 'FAIL'}`)
    console.log(`✓ Device Logs API:       ${results.deviceLogs ? 'PASS' : 'FAIL'}`)
    console.log()

    if (results.cumulativeEnergy !== null) {
      console.log(`Cumulative Energy (raw): ${results.cumulativeEnergy}`)
      console.log()
    }

    // Get current device status
    console.log('CURRENT DEVICE STATUS:')
    console.log('-'.repeat(70))
    try {
      const status = await client.getDeviceStatus()
      console.log('  Switch State:', status.switch_1 ? 'ON' : 'OFF')
      console.log('  Current Power:', (status.cur_power || 0) / 10, 'W')
      console.log('  Current (mA):', status.cur_current || 0)
      console.log('  Voltage:', (status.cur_voltage || 0) / 10, 'V')
      console.log('  Cumulative Energy (add_ele):', status.add_ele)
      console.log()
    } catch (error) {
      console.log('  Failed to retrieve device status')
      console.log()
    }

    // Check charging status
    console.log('CHARGING SESSION STATUS:')
    console.log('-'.repeat(70))
    try {
      const charging = await client.monitorChargingSession()
      console.log('  Is Charging:', charging.isCharging ? 'YES' : 'NO')
      console.log('  Current Power:', charging.currentPower, 'W')
      console.log('  Switch State:', charging.switchState ? 'ON' : 'OFF')
      console.log()
    } catch (error) {
      console.log('  Failed to check charging status')
      console.log()
    }

    // Test energy data retrieval for today
    console.log('ENERGY DATA TEST (Today):')
    console.log('-'.repeat(70))
    try {
      const today = new Date().toISOString().split('T')[0]
      const energyData = await client.getEnergyDataForDate(today)

      console.log(`  Date: ${today}`)
      console.log(`  Energy: ${energyData.energy_kwh.toFixed(3)} kWh`)
      console.log(`  Cost: $${energyData.cost.toFixed(2)}`)
      console.log(`  Source: ${energyData.source}`)
      console.log(`  Confidence: ${energyData.confidence}`)
      console.log(`  Message: ${energyData.message}`)
      console.log()
    } catch (error) {
      console.log('  Failed to retrieve energy data')
      console.log()
    }

    // Display recommendations
    if (results.recommendations.length > 0) {
      console.log('RECOMMENDATIONS:')
      console.log('-'.repeat(70))
      results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`)
      })
      console.log()
    }

    // Summary
    console.log('='.repeat(70))
    console.log('SUMMARY:')
    console.log('-'.repeat(70))

    const totalTests = 4
    const passedTests = [
      results.authentication,
      results.deviceStatus,
      results.energyAPI,
      results.deviceLogs
    ].filter(Boolean).length

    console.log(`Tests Passed: ${passedTests}/${totalTests}`)
    console.log()

    if (results.energyAPI) {
      console.log('✓ Energy Management API is working!')
      console.log('  You should be able to retrieve energy data automatically.')
      console.log()
    } else {
      console.log('✗ Energy Management API is NOT working')
      console.log('  Action required:')
      console.log('  1. Log in to Tuya IoT Platform: https://platform.tuya.com')
      console.log('  2. Go to Cloud → Cloud Services')
      console.log('  3. Subscribe to "Energy Management" service')
      console.log('  4. Authorize your project to use this service')
      console.log()
      console.log('  Alternative: Manually enter energy values from Tuya app')
      console.log()
    }

    console.log('='.repeat(70))

  } catch (error) {
    console.error('\nFATAL ERROR:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Run diagnostics
runDiagnostics()
  .then(() => {
    console.log('\nDiagnostics complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nDiagnostics failed:', error)
    process.exit(1)
  })
