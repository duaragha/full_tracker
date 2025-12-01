import { NextRequest, NextResponse } from 'next/server'
import { TuyaLocalAPI } from '@/lib/tuya-local'
import { TOU_RATES } from '@/lib/ontario-tou-rates'

/**
 * Get energy consumption data from local Tuya device
 *
 * POST /api/tuya/charging-data
 * Body: { date: "YYYY-MM-DD", electricityRate?: number }
 *
 * Returns current energy data from smart plug.
 * For historical data by date, see /api/tuya/charging-data-historical
 *
 * Note: This uses local API. Device must be on the same network.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, electricityRate } = body

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Create local Tuya client
    const deviceId = process.env.TUYA_DEVICE_ID
    const localKey = process.env.TUYA_LOCAL_KEY
    const ip = process.env.TUYA_DEVICE_IP

    if (!deviceId || !localKey || !ip) {
      return NextResponse.json(
        {
          success: false,
          error: 'Local Tuya configuration missing',
          details: 'Missing TUYA_DEVICE_ID, TUYA_LOCAL_KEY, or TUYA_DEVICE_IP environment variables',
        },
        { status: 500 }
      )
    }

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
          error: 'Failed to connect to smart plug',
          details: 'Device is offline or unreachable. Check network connection and IP address.',
        },
        { status: 500 }
      )
    }

    try {
      // Get current energy data from device
      const energyData = await tuyaClient.getEnergyData()

      // Use Ontario off-peak rate as default (most charging happens overnight)
      const rate = electricityRate || TOU_RATES.OFF_PEAK
      const cost = energyData.total_kwh * rate

      return NextResponse.json({
        success: true,
        message: 'Energy data retrieved from local device',
        data: {
          energy_kwh: parseFloat(energyData.total_kwh.toFixed(3)),
          cost: parseFloat(cost.toFixed(2)),
          date,
          voltage: parseFloat(energyData.voltage.toFixed(1)),
          current: parseFloat(energyData.current.toFixed(3)),
          power: parseFloat(energyData.power.toFixed(1)),
          switchState: energyData.switchState,
          source: 'local_device',
          confidence: 'high',
          timestamp: new Date().toISOString(),
        },
      })
    } finally {
      await tuyaClient.disconnect()
    }
  } catch (error) {
    console.error('Error fetching Tuya charging data:', error)

    // Return user-friendly error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch charging data from smart plug',
        details: errorMessage,
        solution: 'Verify device is on the same network and reachable at configured IP address',
      },
      { status: 500 }
    )
  }
}
