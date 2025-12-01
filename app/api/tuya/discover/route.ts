/**
 * Tuya Device Discovery Endpoint
 *
 * Discovers Tuya devices on the local network via UDP broadcast.
 * This helps users find their device's ID and IP without manual configuration.
 *
 * GET /api/tuya/discover
 *
 * Response:
 * {
 *   "success": true,
 *   "devices": [
 *     {
 *       "id": "bf123456789abcdef",
 *       "ip": "192.168.1.100",
 *       "name": "Smart Plug",
 *       "productId": "keyfwwtuvy44ch3z",
 *       "version": "3.3"
 *     }
 *   ]
 * }
 *
 * Notes:
 * - Discovery requires device to be on same network
 * - Device must not be in pairing mode
 * - Firewall must allow UDP ports 6666, 6667, 7000
 * - Discovery may take 5-10 seconds
 */

import { NextRequest, NextResponse } from 'next/server'
import TuyAPI from 'tuyapi'

/**
 * Represents a discovered Tuya device
 */
interface DiscoveredDevice {
  id: string
  ip: string
  name?: string
  productId?: string
  version?: string
  productName?: string
  model?: string
  key?: string
}

/**
 * Discover Tuya devices on local network
 *
 * @returns List of discovered devices with their IP and ID
 */
export async function GET(request: NextRequest) {
  try {
    // Discover devices on network
    const discoveryResults = await TuyAPI.discover({
      timeout: 10000, // 10 second timeout
    })

    // Extract device list
    const devices: DiscoveredDevice[] = (discoveryResults.devices || []).map(
      (device: any) => ({
        id: device.id,
        ip: device.ip,
        name: device.name,
        productId: device.productId,
        version: device.version,
        productName: device.productName,
        model: device.model,
      })
    )

    return NextResponse.json({
      success: true,
      devices,
      count: devices.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Device discovery error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Return appropriate error response
    return NextResponse.json(
      {
        success: false,
        error: 'Device discovery failed',
        details: errorMessage,
        suggestions: [
          'Verify device is on the same network as this computer',
          'Check firewall allows UDP ports 6666, 6667, 7000',
          'Try again in a few seconds (network discovery can be slow)',
          'Ensure device is powered on and connected to WiFi',
        ],
      },
      { status: 500 }
    )
  }
}

/**
 * Device discovery is only available via GET
 * POST/PUT/DELETE not supported
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET /api/tuya/discover' },
    { status: 405 }
  )
}
