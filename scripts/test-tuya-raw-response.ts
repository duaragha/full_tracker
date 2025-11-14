/**
 * Test script to check raw Tuya API response for energy data
 * This helps debug the unit conversion issue
 */

import { createTuyaClient } from '../lib/tuya-api'

async function testTuyaRawResponse() {
  console.log('=== Testing Tuya API Raw Response ===\n')

  const client = createTuyaClient()

  // Test Nov 12, 2024
  const testDate = '2024-11-12'
  console.log(`Testing date: ${testDate}`)
  console.log(`Expected: 11.22 kWh according to smart plug`)
  console.log(`App recorded: 2.17 kWh\n`)

  try {
    // Get the raw energy data
    console.log('Fetching energy data from Tuya API...')
    const energyData = await client.getEnergyDataForDate(testDate)

    console.log('\n=== Energy Data Response ===')
    console.log(JSON.stringify(energyData, null, 2))

    // Test the statistics API directly
    console.log('\n=== Testing Statistics API Directly ===')
    const formattedDate = '20241112' // Nov 12, 2024

    // Call the statistics API
    await client.getAccessToken()
    const statsValue = await client.getDeviceStatistics(formattedDate, formattedDate, 'day')

    console.log(`Raw statistics API result: ${statsValue}`)
    console.log(`After treating as kWh: ${statsValue} kWh`)
    console.log(`Expected: 11.22 kWh`)
    console.log(`Ratio (expected/actual): ${11.22 / statsValue}`)

    // Check device status for add_ele
    console.log('\n=== Device Status (add_ele) ===')
    const status = await client.getDeviceStatus()
    console.log(`add_ele raw value: ${status.add_ele}`)
    console.log(`add_ele ÷ 1000: ${status.add_ele / 1000} kWh (scale 3)`)
    console.log(`add_ele ÷ 100: ${status.add_ele / 100} kWh (scale 2)`)
    console.log(`add_ele ÷ 10: ${status.add_ele / 10} kWh (scale 1)`)

  } catch (error) {
    console.error('Error:', error)
  }
}

testTuyaRawResponse()
