import { NextRequest, NextResponse } from 'next/server'
import { TuyaLocalAPI } from '@/lib/tuya-local'

/**
 * Monitor Tuya device in real-time
 *
 * GET /api/tuya/monitor - Check device connection status
 * POST /api/tuya/monitor - Get current energy readings
 *
 * Returns live energy data from smart plug.
 * No cloud connection required - local network only.
 */

/**
 * GET: Check if auto-collection is possible (local device status)
 */
export async function GET(request: NextRequest) {
  try {
    // Get configuration from environment
    const deviceId = process.env.TUYA_DEVICE_ID
    const localKey = process.env.TUYA_LOCAL_KEY
    const ip = process.env.TUYA_DEVICE_IP

    if (!deviceId || !localKey || !ip) {
      return NextResponse.json({
        success: false,
        autoCollectionAvailable: false,
        message: 'Local Tuya device not configured',
      })
    }

    // Create local Tuya client
    const tuyaClient = new TuyaLocalAPI({
      deviceId,
      localKey,
      ip,
    })

    // Test connection
    const connected = await tuyaClient.connect()
    await tuyaClient.disconnect()

    return NextResponse.json({
      success: true,
      autoCollectionAvailable: connected,
      connectionStatus: connected ? 'connected' : 'offline',
      localDeviceConfigured: true,
    })
  } catch (error) {
    console.error('Error checking device status:', error)

    return NextResponse.json({
      success: false,
      autoCollectionAvailable: false,
      error: 'Failed to check device status',
    })
  }
}

/**
 * POST: Get current energy monitoring data
 */
export async function POST(request: NextRequest) {
  try {
    // Get configuration from environment
    const deviceId = process.env.TUYA_DEVICE_ID
    const localKey = process.env.TUYA_LOCAL_KEY
    const ip = process.env.TUYA_DEVICE_IP

    if (!deviceId || !localKey || !ip) {
      return NextResponse.json(
        {
          success: false,
          error: 'Local Tuya device not configured',
          details: 'Missing TUYA_DEVICE_ID, TUYA_LOCAL_KEY, or TUYA_DEVICE_IP',
        },
        { status: 500 }
      )
    }

    // Create local Tuya client
    const tuyaClient = new TuyaLocalAPI({
      deviceId,
      localKey,
      ip,
    })

    // Connect to device
    const connected = await tuyaClient.connect()
    if (!connected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to device',
          details: 'Device is offline or unreachable',
        },
        { status: 500 }
      )
    }

    try {
      // Get current energy data
      const energyData = await tuyaClient.getEnergyData()

      // Return live monitoring data
      return NextResponse.json({
        success: true,
        data: {
          isCharging: energyData.power > 0,
          currentPower: energyData.power,
          voltage: energyData.voltage,
          current: energyData.current,
          totalEnergy: energyData.total_kwh,
          switchState: energyData.switchState,
          timestamp: new Date().toISOString(),
        },
        deviceInfo: {
          id: deviceId,
          ip: ip,
          type: 'local',
        },
      })
    } finally {
      await tuyaClient.disconnect()
    }
  } catch (error) {
    console.error('Error monitoring Tuya device:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to monitor device',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
