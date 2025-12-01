import { NextRequest, NextResponse } from 'next/server'
import { TuyaLocalAPI } from '@/lib/tuya-local'

/**
 * Diagnostic endpoint for local Tuya device
 *
 * GET /api/tuya/diagnostics
 *
 * Tests connection and retrieves current device status.
 * Used for troubleshooting and verifying local API setup.
 *
 * Note: This uses local API. Device must be on the same network.
 */
export async function GET(request: NextRequest) {
  try {
    // Get configuration from environment
    const deviceId = process.env.TUYA_DEVICE_ID
    const localKey = process.env.TUYA_LOCAL_KEY
    const ip = process.env.TUYA_DEVICE_IP

    if (!deviceId || !localKey || !ip) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error: 'Local Tuya configuration missing',
          details: 'Missing required environment variables: TUYA_DEVICE_ID, TUYA_LOCAL_KEY, TUYA_DEVICE_IP',
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

    // Test connection
    const connected = await tuyaClient.connect()

    if (!connected) {
      return NextResponse.json({
        success: false,
        configured: true,
        connectionStatus: 'offline',
        message: 'Device is offline or unreachable',
        recommendations: [
          'Verify device IP address is correct',
          'Check device is powered on and connected to WiFi',
          'Ensure this computer is on the same network',
          'Check firewall allows UDP ports 6666, 6667, 7000',
          'Verify local key is correct (from TUYA_LOCAL_SETUP_GUIDE.md)',
        ],
        timestamp: new Date().toISOString(),
      })
    }

    try {
      // Get current energy data
      const energyData = await tuyaClient.getEnergyData()

      return NextResponse.json({
        success: true,
        configured: true,
        connectionStatus: 'connected',
        deviceInfo: {
          id: deviceId,
          ip: ip,
        },
        currentStatus: {
          voltage: parseFloat(energyData.voltage.toFixed(1)),
          current: parseFloat(energyData.current.toFixed(3)),
          power: parseFloat(energyData.power.toFixed(1)),
          totalEnergy: parseFloat(energyData.total_kwh.toFixed(3)),
          switchState: energyData.switchState,
        },
        recommendations: [
          'Local device connection working correctly',
          'No cloud API required - local control active',
        ],
        timestamp: new Date().toISOString(),
      })
    } finally {
      await tuyaClient.disconnect()
    }
  } catch (error) {
    console.error('Error running diagnostics:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run diagnostics',
        details: errorMessage,
        recommendations: [
          'Check local key format (should be 32 characters)',
          'Verify device ID matches configured device',
          'Try restarting the device',
          'Check network connectivity',
        ],
      },
      { status: 500 }
    )
  }
}
