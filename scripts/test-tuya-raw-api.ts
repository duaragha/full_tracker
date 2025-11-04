import crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const config = {
  clientId: process.env.TUYA_CLIENT_ID!,
  clientSecret: process.env.TUYA_CLIENT_SECRET!,
  deviceId: process.env.TUYA_DEVICE_ID!,
  dataCenter: process.env.TUYA_DATA_CENTER || 'us',
  baseUrl: 'https://openapi.tuyaus.com'
}

let accessToken: string | null = null

function generateSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string
): string {
  const contentHash = crypto.createHash('sha256').update(body).digest('hex')
  const [basePath, queryString] = path.split('?')
  let url = basePath

  if (queryString) {
    const params = new URLSearchParams(queryString)
    const sortedParams = Array.from(params.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))

    if (sortedParams.length > 0) {
      url = basePath + '?' + sortedParams.map(([key, value]) => `${key}=${value}`).join('&')
    }
  }

  const stringToSign = [method, contentHash, '', url].join('\n')
  const str = config.clientId + (accessToken || '') + timestamp + stringToSign
  const signature = crypto
    .createHmac('sha256', config.clientSecret)
    .update(str)
    .digest('hex')
    .toUpperCase()

  return signature
}

async function makeRequest(method: string, path: string, body: any = null): Promise<any> {
  const timestamp = Date.now().toString()
  const bodyStr = body ? JSON.stringify(body) : ''
  const signature = generateSignature(method, path, bodyStr, timestamp)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    client_id: config.clientId,
    sign: signature,
    t: timestamp,
    sign_method: 'HMAC-SHA256',
  }

  if (accessToken) {
    headers.access_token = accessToken
  }

  const url = `${config.baseUrl}${path}`
  const options: RequestInit = {
    method,
    headers,
  }

  if (body) {
    options.body = bodyStr
  }

  console.log(`\n🔗 ${method} ${path}`)
  console.log(`   URL: ${url}`)

  const response = await fetch(url, options)
  const data = await response.json()

  console.log(`   Status: ${response.status}`)
  console.log(`   Success: ${data.success}`)

  if (!data.success) {
    console.log(`   Error: ${data.msg || 'Unknown error'}`)
    console.log(`   Code: ${data.code || 'N/A'}`)
  }

  return data
}

async function testRawAPI() {
  console.log('🧪 TUYA RAW API TESTING\n')
  console.log('=' .repeat(70))
  console.log('Configuration:')
  console.log(`  Client ID: ${config.clientId}`)
  console.log(`  Device ID: ${config.deviceId}`)
  console.log(`  Data Center: ${config.dataCenter}`)
  console.log(`  Base URL: ${config.baseUrl}`)
  console.log('=' .repeat(70))

  try {
    // Test 1: Get access token
    console.log('\n📝 TEST 1: Get Access Token')
    console.log('-'.repeat(70))
    const tokenResponse = await makeRequest('GET', '/v1.0/token?grant_type=1')

    if (tokenResponse.success) {
      accessToken = tokenResponse.result.access_token
      console.log(`   ✅ Token obtained: ${accessToken.substring(0, 30)}...`)
      console.log(`   Expires in: ${tokenResponse.result.expire_time} seconds`)
    } else {
      console.log(`   ❌ Failed to get token`)
      return
    }

    // Test 2: Get device info
    console.log('\n📝 TEST 2: Get Device Information')
    console.log('-'.repeat(70))
    const deviceInfo = await makeRequest('GET', `/v1.0/devices/${config.deviceId}`)

    if (deviceInfo.success) {
      console.log(`   ✅ Device info retrieved`)
      console.log(`   Name: ${deviceInfo.result.name}`)
      console.log(`   Product ID: ${deviceInfo.result.product_id}`)
      console.log(`   Online: ${deviceInfo.result.online}`)
      console.log(`   Category: ${deviceInfo.result.category}`)
      console.log(`   Model: ${deviceInfo.result.model || 'N/A'}`)
      console.log(`\n   Full response:`)
      console.log(JSON.stringify(deviceInfo.result, null, 2))
    } else {
      console.log(`   ❌ Failed to get device info`)
    }

    // Test 3: Get device status
    console.log('\n📝 TEST 3: Get Device Status')
    console.log('-'.repeat(70))
    const status = await makeRequest('GET', `/v1.0/devices/${config.deviceId}/status`)

    if (status.success) {
      console.log(`   ✅ Status retrieved`)
      console.log(`\n   Status data:`)
      console.log(JSON.stringify(status.result, null, 2))
    }

    // Test 4: Get device functions
    console.log('\n📝 TEST 4: Get Device Functions')
    console.log('-'.repeat(70))
    const functions = await makeRequest('GET', `/v1.0/devices/${config.deviceId}/functions`)

    if (functions.success) {
      console.log(`   ✅ Functions retrieved`)
      console.log(`\n   Functions:`)
      console.log(JSON.stringify(functions.result, null, 2))
    }

    // Test 5: Get device specifications
    console.log('\n📝 TEST 5: Get Device Specifications')
    console.log('-'.repeat(70))
    const specs = await makeRequest('GET', `/v1.0/devices/${config.deviceId}/specifications`)

    if (specs.success) {
      console.log(`   ✅ Specifications retrieved`)
      console.log(`\n   Specifications:`)
      console.log(JSON.stringify(specs.result, null, 2))
    }

    // Test 6: Energy Management API - Daily statistics
    console.log('\n📝 TEST 6: Energy Management API - Daily Statistics (Today)')
    console.log('-'.repeat(70))
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')

    const params = new URLSearchParams({
      energy_action: 'consume',
      statistics_type: 'day',
      start_time: dateStr,
      end_time: dateStr,
      contain_childs: 'false',
      device_ids: config.deviceId
    })

    const energyDaily = await makeRequest(
      'GET',
      `/v1.0/iot-03/energy/electricity/device/nodes/statistics-sum?${params.toString()}`
    )

    if (energyDaily.success) {
      console.log(`   ✅ Energy data retrieved: ${energyDaily.result} kWh`)
    }

    // Test 7: Energy Management API - Hourly statistics
    console.log('\n📝 TEST 7: Energy Management API - Hourly Statistics')
    console.log('-'.repeat(70))
    const hourStr = today.toISOString().split('T')[0].replace(/-/g, '') + '00'

    const paramsHourly = new URLSearchParams({
      energy_action: 'consume',
      statistics_type: 'hour',
      start_time: hourStr,
      end_time: dateStr + '23',
      contain_childs: 'false',
      device_ids: config.deviceId
    })

    const energyHourly = await makeRequest(
      'GET',
      `/v1.0/iot-03/energy/electricity/device/nodes/statistics-sum?${paramsHourly.toString()}`
    )

    if (energyHourly.success) {
      console.log(`   ✅ Hourly energy data retrieved: ${energyHourly.result} kWh`)
    }

    // Test 8: Alternative energy endpoint
    console.log('\n📝 TEST 8: Alternative Energy Endpoint (Statistics Detail)')
    console.log('-'.repeat(70))
    const energyDetail = await makeRequest(
      'GET',
      `/v1.0/iot-03/energy/electricity/device/nodes/statistics-detail?${params.toString()}`
    )

    if (energyDetail.success) {
      console.log(`   ✅ Detailed energy data retrieved`)
      console.log(JSON.stringify(energyDetail.result, null, 2))
    }

    // Test 9: Device logs
    console.log('\n📝 TEST 9: Device Logs')
    console.log('-'.repeat(70))
    const logs = await makeRequest(
      'GET',
      `/v1.0/devices/${config.deviceId}/logs?type=7&start_time=${Date.now() - 86400000}&end_time=${Date.now()}`
    )

    if (logs.success) {
      console.log(`   ✅ Logs retrieved`)
      console.log(JSON.stringify(logs.result, null, 2))
    }

    // Test 10: Device data by date
    console.log('\n📝 TEST 10: Try getting real-time current/power data')
    console.log('-'.repeat(70))
    const statusAgain = await makeRequest('GET', `/v1.0/devices/${config.deviceId}/status`)

    if (statusAgain.success) {
      const statusMap: Record<string, any> = {}
      statusAgain.result.forEach((item: any) => {
        statusMap[item.code] = item.value
      })

      console.log(`   Current Power: ${statusMap.cur_power} W`)
      console.log(`   Current: ${statusMap.cur_current} mA`)
      console.log(`   Voltage: ${statusMap.cur_voltage / 10} V`)

      // Try to calculate energy from coefficients
      if (statusMap.electric_coe !== undefined) {
        console.log(`\n   Electric coefficient: ${statusMap.electric_coe}`)
        console.log(`   This might be accumulated energy in device units`)
        console.log(`   Possible conversion needed to kWh`)
      }
    }

  } catch (error) {
    console.error('\n💥 Error:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 SUMMARY')
  console.log('='.repeat(70))
  console.log('\nThis test explored various Tuya API endpoints to understand')
  console.log('what data is available and how to access energy consumption data.')
  console.log('\nKey findings will be in the test output above.')
  console.log('='.repeat(70))
}

testRawAPI()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })
