import { NextRequest, NextResponse } from 'next/server'
import { createTuyaClient } from '@/lib/tuya-api'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 5,
})

export async function POST(request: NextRequest) {
  try {
    // Create Tuya client
    const tuyaClient = createTuyaClient()

    // Monitor current charging session
    const session = await tuyaClient.monitorChargingSession()

    // Get device status for more details
    const status = await tuyaClient.getDeviceStatus()

    // Calculate cumulative energy (if available)
    const cumulativeEnergy = await tuyaClient.getCumulativeEnergy()

    // Return status
    return NextResponse.json({
      success: true,
      data: {
        isCharging: session.isCharging,
        currentPower: session.currentPower,
        switchState: session.switchState,
        cumulativeEnergy,
        deviceStatus: {
          switch: status.switch_1,
          power: (status.cur_power || 0) / 10,
          current: status.cur_current,
          voltage: (status.cur_voltage || 0) / 10,
        },
        timestamp: new Date().toISOString()
      }
    })
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

/**
 * GET endpoint to check if auto-collection is possible
 */
export async function GET(request: NextRequest) {
  try {
    const tuyaClient = createTuyaClient()
    const diagnostics = await tuyaClient.runDiagnostics()

    return NextResponse.json({
      success: true,
      autoCollectionAvailable: diagnostics.energyAPI,
      diagnostics: {
        authentication: diagnostics.authentication,
        deviceStatus: diagnostics.deviceStatus,
        energyAPI: diagnostics.energyAPI,
        deviceLogs: diagnostics.deviceLogs,
      },
      recommendations: diagnostics.recommendations
    })
  } catch (error) {
    console.error('Error checking auto-collection status:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check auto-collection status',
      },
      { status: 500 }
    )
  }
}
