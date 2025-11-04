import { createTuyaClient } from '../lib/tuya-api'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function testTuyaComprehensive() {
  console.log('🔧 COMPREHENSIVE TUYA API TEST\n')
  console.log('=' .repeat(70))
  console.log('Configuration:')
  console.log('  Client ID:', process.env.TUYA_CLIENT_ID)
  console.log('  Device ID:', process.env.TUYA_DEVICE_ID)
  console.log('  Data Center:', process.env.TUYA_DATA_CENTER)
  console.log('=' .repeat(70))
  console.log()

  const results: any = {
    authentication: { success: false, error: null, details: null },
    deviceStatus: { success: false, error: null, details: null },
    energyToday: { success: false, error: null, details: null },
    energyYesterday: { success: false, error: null, details: null },
    energyLastWeek: { success: false, error: null, details: null },
    energyHistorical: { success: false, error: null, details: null },
    apiEndpoints: {},
    deviceCapabilities: {},
    dataAvailable: {}
  }

  try {
    const client = createTuyaClient()

    // ===== TEST 1: Authentication =====
    console.log('📝 TEST 1: AUTHENTICATION')
    console.log('-'.repeat(70))
    try {
      const token = await client.getAccessToken()
      results.authentication.success = true
      results.authentication.details = {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      }
      console.log('   ✅ SUCCESS: Authentication working')
      console.log(`   Token preview: ${token.substring(0, 30)}...`)
    } catch (error) {
      results.authentication.error = error instanceof Error ? error.message : String(error)
      console.log('   ❌ FAILED: Authentication failed')
      console.log(`   Error: ${results.authentication.error}`)
      return results
    }
    console.log()

    // ===== TEST 2: Device Status =====
    console.log('📝 TEST 2: DEVICE STATUS')
    console.log('-'.repeat(70))
    try {
      const status = await client.getDeviceStatus()
      results.deviceStatus.success = true
      results.deviceStatus.details = status

      console.log('   ✅ SUCCESS: Device status retrieved')
      console.log('\n   Device Information:')
      console.log('   ------------------')

      // Parse and display relevant fields
      if (status.switch_1 !== undefined) {
        console.log(`   Power Status: ${status.switch_1 ? 'ON' : 'OFF'}`)
        results.deviceCapabilities.powerSwitch = true
      }

      if (status.cur_power !== undefined) {
        console.log(`   Current Power: ${status.cur_power} W`)
        results.deviceCapabilities.currentPower = true
      }

      if (status.cur_current !== undefined) {
        console.log(`   Current: ${status.cur_current} mA`)
        results.deviceCapabilities.current = true
      }

      if (status.cur_voltage !== undefined) {
        console.log(`   Voltage: ${(status.cur_voltage / 10).toFixed(1)} V`)
        results.deviceCapabilities.voltage = true
      }

      if (status.add_ele !== undefined) {
        console.log(`   Energy Tracking: ${status.add_ele ? 'ENABLED' : 'DISABLED'}`)
        results.deviceCapabilities.energyTracking = status.add_ele === 1
      }

      // Display all available data points
      console.log('\n   All Available Data Points:')
      console.log('   -------------------------')
      Object.entries(status).forEach(([key, value]) => {
        console.log(`   ${key}: ${JSON.stringify(value)}`)
      })
    } catch (error) {
      results.deviceStatus.error = error instanceof Error ? error.message : String(error)
      console.log('   ❌ FAILED: Could not get device status')
      console.log(`   Error: ${results.deviceStatus.error}`)
    }
    console.log()

    // ===== TEST 3: Energy Data - Today =====
    console.log('📝 TEST 3: ENERGY DATA - TODAY')
    console.log('-'.repeat(70))
    try {
      const today = new Date().toISOString().split('T')[0]
      const todayFormatted = today.replace(/-/g, '')

      console.log(`   Testing date: ${today} (format: ${todayFormatted})`)
      const energy = await client.getEnergyForDate(today)

      results.energyToday.success = true
      results.energyToday.details = { date: today, energy, unit: 'kWh' }
      results.dataAvailable.today = energy > 0

      if (energy > 0) {
        console.log(`   ✅ SUCCESS: Energy data found`)
        console.log(`   Energy: ${energy.toFixed(3)} kWh`)
        console.log(`   Cost @ $0.20/kWh: $${(energy * 0.20).toFixed(2)}`)
      } else {
        console.log(`   ⚠️  WARNING: No energy data for today (0.000 kWh)`)
        console.log(`   This could mean:`)
        console.log(`     - Device hasn't been used today`)
        console.log(`     - Data hasn't synced yet`)
        console.log(`     - Energy Management API not subscribed`)
      }
    } catch (error) {
      results.energyToday.error = error instanceof Error ? error.message : String(error)
      console.log('   ❌ FAILED: Could not fetch energy data')
      console.log(`   Error: ${results.energyToday.error}`)
    }
    console.log()

    // ===== TEST 4: Energy Data - Yesterday =====
    console.log('📝 TEST 4: ENERGY DATA - YESTERDAY')
    console.log('-'.repeat(70))
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      console.log(`   Testing date: ${yesterdayStr}`)
      const energy = await client.getEnergyForDate(yesterdayStr)

      results.energyYesterday.success = true
      results.energyYesterday.details = { date: yesterdayStr, energy, unit: 'kWh' }
      results.dataAvailable.yesterday = energy > 0

      if (energy > 0) {
        console.log(`   ✅ SUCCESS: Energy data found`)
        console.log(`   Energy: ${energy.toFixed(3)} kWh`)
        console.log(`   Cost @ $0.20/kWh: $${(energy * 0.20).toFixed(2)}`)
      } else {
        console.log(`   ⚠️  WARNING: No energy data for yesterday (0.000 kWh)`)
      }
    } catch (error) {
      results.energyYesterday.error = error instanceof Error ? error.message : String(error)
      console.log('   ❌ FAILED: Could not fetch energy data')
      console.log(`   Error: ${results.energyYesterday.error}`)
    }
    console.log()

    // ===== TEST 5: Energy Data - Last 7 Days =====
    console.log('📝 TEST 5: ENERGY DATA - LAST 7 DAYS')
    console.log('-'.repeat(70))
    try {
      const energyData = []
      let totalEnergy = 0
      let daysWithData = 0

      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        try {
          const energy = await client.getEnergyForDate(dateStr)
          energyData.push({ date: dateStr, energy })
          if (energy > 0) {
            totalEnergy += energy
            daysWithData++
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (err) {
          energyData.push({ date: dateStr, energy: null, error: true })
        }
      }

      results.energyLastWeek.success = true
      results.energyLastWeek.details = {
        data: energyData,
        totalEnergy,
        daysWithData,
        avgEnergyPerDay: daysWithData > 0 ? totalEnergy / daysWithData : 0
      }
      results.dataAvailable.lastWeek = daysWithData > 0

      console.log(`   ✅ TEST COMPLETE`)
      console.log(`\n   Last 7 Days Summary:`)
      console.log('   -------------------')
      energyData.forEach(({ date, energy, error }) => {
        if (error) {
          console.log(`   ${date}: ERROR`)
        } else if (energy === null) {
          console.log(`   ${date}: N/A`)
        } else if (energy > 0) {
          console.log(`   ${date}: ${energy.toFixed(3)} kWh ✓`)
        } else {
          console.log(`   ${date}: 0.000 kWh`)
        }
      })

      console.log(`\n   Total Energy (7 days): ${totalEnergy.toFixed(3)} kWh`)
      console.log(`   Days with data: ${daysWithData}/7`)
      if (daysWithData > 0) {
        console.log(`   Average per day: ${(totalEnergy / daysWithData).toFixed(3)} kWh`)
        console.log(`   Total cost @ $0.20/kWh: $${(totalEnergy * 0.20).toFixed(2)}`)
      }
    } catch (error) {
      results.energyLastWeek.error = error instanceof Error ? error.message : String(error)
      console.log('   ❌ FAILED: Could not fetch historical data')
      console.log(`   Error: ${results.energyLastWeek.error}`)
    }
    console.log()

    // ===== TEST 6: Historical Data (30 days ago) =====
    console.log('📝 TEST 6: HISTORICAL DATA ACCESS (30 days ago)')
    console.log('-'.repeat(70))
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0]

      console.log(`   Testing date: ${dateStr}`)
      const energy = await client.getEnergyForDate(dateStr)

      results.energyHistorical.success = true
      results.energyHistorical.details = { date: dateStr, energy, unit: 'kWh' }
      results.dataAvailable.historical = energy > 0

      if (energy > 0) {
        console.log(`   ✅ SUCCESS: Historical data accessible`)
        console.log(`   Energy: ${energy.toFixed(3)} kWh`)
      } else {
        console.log(`   ⚠️  INFO: No energy data for this date`)
      }
    } catch (error) {
      results.energyHistorical.error = error instanceof Error ? error.message : String(error)
      console.log('   ❌ FAILED: Could not fetch historical data')
      console.log(`   Error: ${results.energyHistorical.error}`)
    }
    console.log()

  } catch (error) {
    console.error('💥 FATAL ERROR:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
  }

  // ===== FINAL SUMMARY =====
  console.log('\n' + '='.repeat(70))
  console.log('📊 FINAL TEST SUMMARY')
  console.log('='.repeat(70))
  console.log()

  console.log('API Connectivity:')
  console.log(`  Authentication: ${results.authentication.success ? '✅ WORKING' : '❌ FAILED'}`)
  console.log(`  Device Status:  ${results.deviceStatus.success ? '✅ WORKING' : '❌ FAILED'}`)
  console.log(`  Energy API:     ${results.energyToday.success ? '✅ WORKING' : '❌ FAILED'}`)
  console.log()

  console.log('Device Capabilities:')
  console.log(`  Power Switch:      ${results.deviceCapabilities.powerSwitch ? '✅ YES' : '❌ NO'}`)
  console.log(`  Current Power:     ${results.deviceCapabilities.currentPower ? '✅ YES' : '❌ NO'}`)
  console.log(`  Voltage:           ${results.deviceCapabilities.voltage ? '✅ YES' : '❌ NO'}`)
  console.log(`  Energy Tracking:   ${results.deviceCapabilities.energyTracking ? '✅ ENABLED' : '❌ DISABLED'}`)
  console.log()

  console.log('Data Availability:')
  console.log(`  Today:        ${results.dataAvailable.today ? '✅ DATA FOUND' : '⚠️  NO DATA'}`)
  console.log(`  Yesterday:    ${results.dataAvailable.yesterday ? '✅ DATA FOUND' : '⚠️  NO DATA'}`)
  console.log(`  Last 7 Days:  ${results.dataAvailable.lastWeek ? '✅ DATA FOUND' : '⚠️  NO DATA'}`)
  console.log(`  Historical:   ${results.dataAvailable.historical ? '✅ DATA FOUND' : '⚠️  NO DATA'}`)
  console.log()

  console.log('Key Findings:')
  if (results.authentication.success && results.deviceStatus.success) {
    console.log('  ✅ API credentials are valid and working')
    console.log('  ✅ Device is online and responding')

    if (results.deviceCapabilities.energyTracking) {
      console.log('  ✅ Energy tracking is enabled on device')
    } else {
      console.log('  ⚠️  Energy tracking may not be enabled on device')
    }

    if (!results.dataAvailable.today && !results.dataAvailable.yesterday && !results.dataAvailable.lastWeek) {
      console.log('  ⚠️  NO ENERGY DATA FOUND for any recent dates')
      console.log('  📋 Possible reasons:')
      console.log('     1. Energy Management API not subscribed in Tuya IoT Platform')
      console.log('     2. Device has not recorded any charging sessions')
      console.log('     3. Data sync delay (try again in a few minutes)')
      console.log('     4. Smart plug firmware needs update')
    } else if (results.energyLastWeek.details?.daysWithData > 0) {
      console.log(`  ✅ Energy data is being collected (${results.energyLastWeek.details.daysWithData} days with data)`)
      console.log(`  📊 Average daily usage: ${results.energyLastWeek.details.avgEnergyPerDay.toFixed(3)} kWh`)
    }
  } else {
    console.log('  ❌ Basic API connectivity issues detected')
    console.log('  📋 Check:')
    console.log('     - Internet connection')
    console.log('     - Tuya credentials in .env.local')
    console.log('     - Device ID is correct')
  }
  console.log()

  console.log('='.repeat(70))
  console.log('Test completed at:', new Date().toISOString())
  console.log('='.repeat(70))

  return results
}

// Run the comprehensive test
testTuyaComprehensive()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })
