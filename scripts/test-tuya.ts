import { createTuyaClient } from '../lib/tuya-api'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function testTuya() {
  console.log('🔧 Testing Tuya API Connection\n')
  console.log('Configuration:')
  console.log('  Client ID:', process.env.TUYA_CLIENT_ID)
  console.log('  Device ID:', process.env.TUYA_DEVICE_ID)
  console.log('  Data Center:', process.env.TUYA_DATA_CENTER)
  console.log()

  try {
    const client = createTuyaClient()

    console.log('1️⃣ Testing authentication...')
    const token = await client.getAccessToken()
    console.log('   ✅ Authentication successful!')
    console.log('   Token:', token.substring(0, 20) + '...')
    console.log()

    console.log('2️⃣ Testing device status...')
    const status = await client.getDeviceStatus()
    console.log('   ✅ Device status retrieved!')
    console.log('   Status:', JSON.stringify(status, null, 2))
    console.log()

    console.log('3️⃣ Testing energy data for today...')
    const today = new Date().toISOString().split('T')[0]
    const energy = await client.getEnergyForDate(today)
    console.log('   ✅ Energy data retrieved!')
    console.log(`   Energy for ${today}: ${energy.toFixed(3)} kWh`)
    console.log()

    console.log('✨ All tests passed!')
  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
  }
}

testTuya()
