/**
 * TuyaLocalAPI - Local control for Tuya devices
 *
 * Uses the tuyapi library to communicate with Tuya devices via local network
 * instead of cloud API (which requires $25K/year payment).
 *
 * Requires:
 * - TUYA_DEVICE_ID: Device identifier from Tuya app
 * - TUYA_LOCAL_KEY: Extracted local key (see TUYA_LOCAL_SETUP_GUIDE.md)
 * - TUYA_DEVICE_IP: Device IP address on local network
 */

import TuyAPI from 'tuyapi'

/**
 * Configuration for TuyaLocalAPI
 */
export interface TuyaLocalConfig {
  deviceId: string
  localKey: string
  ip: string
  version?: number
}

/**
 * Energy data parsed from device DPS
 */
export interface EnergyData {
  voltage: number // Volts
  current: number // Amperes
  power: number // Watts
  total_kwh: number // Kilowatt-hours
  switchState?: boolean
}

/**
 * TuyaLocalAPI - Local API client for Tuya devices
 *
 * Communicates directly with smart plugs on the local network
 * using UDP/TCP protocol. No cloud connection required.
 */
export class TuyaLocalAPI {
  private config: TuyaLocalConfig
  private device: TuyAPI | null = null
  private connected: boolean = false
  private version: number

  constructor(config: TuyaLocalConfig) {
    // Validate required fields
    if (!config.deviceId) {
      throw new Error('deviceId is required')
    }
    if (!config.localKey) {
      throw new Error('localKey is required')
    }
    if (!config.ip) {
      throw new Error('ip is required')
    }

    this.config = config
    this.version = config.version || 3.3
  }

  /**
   * Establish connection to local Tuya device
   * @returns true if connection successful
   */
  async connect(): Promise<boolean> {
    try {
      this.device = new TuyAPI({
        id: this.config.deviceId,
        key: this.config.localKey,
        ip: this.config.ip,
        version: this.version as any,
        issueGetOnConnect: true,
        autoConnect: true,
      })

      // Handle connection events
      this.device.on('error', (error: any) => {
        console.error('Tuya device connection error:', error)
      })

      // Attempt to connect with timeout
      await Promise.race([
        this.device.find(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        ),
      ])

      this.connected = true
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Failed to connect to Tuya device:', message)
      this.connected = false
      return false
    }
  }

  /**
   * Disconnect from Tuya device
   * @returns true if disconnected successfully
   */
  async disconnect(): Promise<boolean> {
    try {
      if (this.device) {
        this.device.disconnect()
        this.device = null
      }
      this.connected = false
      return true
    } catch (error) {
      console.error('Error disconnecting from device:', error)
      return false
    }
  }

  /**
   * Get raw DPS (Data Points) from device
   * DPS contains all device status information
   *
   * @returns Object with DPS keys and values
   */
  async getStatus(): Promise<Record<number, any>> {
    if (!this.device || !this.connected) {
      await this.connect()
    }

    try {
      if (!this.device) {
        throw new Error('Device not initialized')
      }

      const dps = await this.device.get({
        dps: true,
      })

      return dps || {}
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to get device status: ${message}`)
    }
  }

  /**
   * Parse energy data from device DPS
   *
   * Standard Tuya plug DPS mapping:
   * - DP 1: Switch state (1=on, 0=off)
   * - DP 18: Current (mA) - e.g., 854 = 0.854A
   * - DP 19: Power (W×10) - e.g., 1850 = 185W
   * - DP 20: Voltage (V×10) - e.g., 2410 = 241V
   * - DP 101: Total energy (kWh×100) - e.g., 1245 = 12.45kWh
   *
   * Note: Different device models may use different DP codes.
   * Check device documentation for exact mappings.
   *
   * @returns Parsed energy data
   */
  async getEnergyData(): Promise<EnergyData> {
    const dps = await this.getStatus()

    return {
      // DP 20: Voltage scaled as V×10
      voltage: this.parseDPS(dps, [20], 0) / 10,

      // DP 18: Current in mA
      current: this.parseDPS(dps, [18], 0) / 1000,

      // DP 19: Power scaled as W×10
      power: this.parseDPS(dps, [19], 0) / 10,

      // DP 101: Total energy scaled as kWh×100
      total_kwh: this.parseDPS(dps, [101], 0) / 100,

      // DP 1: Switch state
      switchState: dps[1] === true,
    }
  }

  /**
   * Parse a value from DPS with fallback to alternative DP codes
   * Useful because different device models use different DP codes
   *
   * @param dps Raw DPS object from device
   * @param dpCodes Array of DP codes to try in order
   * @param defaultValue Value to return if none found
   * @returns Parsed value or default
   */
  private parseDPS(dps: Record<number, any>, dpCodes: number[], defaultValue: number): number {
    for (const dpCode of dpCodes) {
      if (dpCode in dps && dps[dpCode] !== null && dps[dpCode] !== undefined) {
        const value = Number(dps[dpCode])
        if (!isNaN(value)) {
          return value
        }
      }
    }
    return defaultValue
  }
}

/**
 * Create TuyaLocalAPI client from environment variables
 *
 * Required environment variables:
 * - TUYA_DEVICE_ID: Device identifier
 * - TUYA_LOCAL_KEY: Local key (32 characters)
 * - TUYA_DEVICE_IP: Device IP on local network (e.g., 192.168.1.100)
 *
 * Optional:
 * - TUYA_DEVICE_VERSION: Protocol version (default: 3.3)
 *
 * @returns Configured TuyaLocalAPI instance
 * @throws Error if required environment variables missing
 */
export function createLocalTuyaClient(): TuyaLocalAPI {
  const deviceId = process.env.TUYA_DEVICE_ID
  const localKey = process.env.TUYA_LOCAL_KEY
  const ip = process.env.TUYA_DEVICE_IP
  const version = process.env.TUYA_DEVICE_VERSION ? parseFloat(process.env.TUYA_DEVICE_VERSION) : undefined

  if (!deviceId || !localKey || !ip) {
    throw new Error(
      'Missing required environment variables: TUYA_DEVICE_ID, TUYA_LOCAL_KEY, TUYA_DEVICE_IP'
    )
  }

  return new TuyaLocalAPI({
    deviceId,
    localKey,
    ip,
    version,
  })
}
