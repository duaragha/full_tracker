import crypto from 'crypto'

interface TuyaConfig {
  clientId: string
  clientSecret: string
  deviceId: string
  dataCenter: string
}

interface TuyaTokenResponse {
  success: boolean
  result: {
    access_token: string
    expire_time: number
    refresh_token: string
    uid: string
  }
  t: number
  tid: string
}

interface TuyaDeviceStatusResponse {
  success: boolean
  result: Array<{
    code: string
    value: any
  }>
  t: number
  tid: string
}

interface TuyaStatisticsResponse {
  success: boolean
  result: number  // Total energy in kWh
  t: number
  tid: string
}

interface TuyaDeviceLogsResponse {
  success: boolean
  result: {
    has_more: boolean
    list: Array<{
      event_id: string
      event_time: number
      status: Array<{
        code: string
        value: any
      }>
    }>
  }
  t: number
  tid: string
}

interface TuyaEnergyData {
  energy_kwh: number
  cost: number
  source: 'energy_api' | 'device_logs' | 'device_status' | 'manual'
  confidence: 'high' | 'medium' | 'low'
  raw_value?: any
  message?: string
}

export class TuyaAPI {
  private config: TuyaConfig
  private accessToken: string | null = null
  private tokenExpiry: number | null = null
  private baseUrl: string
  private electricityRate: number = 0.20 // Default rate

  constructor(config: TuyaConfig) {
    this.config = config
    // Tuya data center URLs
    const dataCenterUrls: Record<string, string> = {
      us: 'https://openapi.tuyaus.com',
      eu: 'https://openapi.tuyaeu.com',
      cn: 'https://openapi.tuyacn.com',
      in: 'https://openapi.tuyain.com',
    }
    this.baseUrl = dataCenterUrls[config.dataCenter] || dataCenterUrls.us
  }

  /**
   * Set electricity rate for cost calculations
   */
  setElectricityRate(rate: number): void {
    this.electricityRate = rate
  }

  /**
   * Generate signature for Tuya API request
   */
  private generateSignature(
    method: string,
    path: string,
    body: string,
    timestamp: string
  ): string {
    const { clientId, clientSecret } = this.config

    // Build string to sign
    const contentHash = crypto.createHash('sha256').update(body).digest('hex')

    // Parse path to extract base path and query params
    const [basePath, queryString] = path.split('?')
    let url = basePath

    // If there are query params, sort them alphabetically and rebuild
    if (queryString) {
      const params = new URLSearchParams(queryString)
      const sortedParams = Array.from(params.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))

      if (sortedParams.length > 0) {
        url = basePath + '?' + sortedParams.map(([key, value]) => `${key}=${value}`).join('&')
      }
    }

    const stringToSign = [method, contentHash, '', url].join('\n')

    // Generate signature
    const str = clientId + (this.accessToken || '') + timestamp + stringToSign
    const signature = crypto
      .createHmac('sha256', clientSecret)
      .update(str)
      .digest('hex')
      .toUpperCase()

    return signature
  }

  /**
   * Make authenticated request to Tuya API
   */
  private async makeRequest<T>(
    method: string,
    path: string,
    body: any = null
  ): Promise<T> {
    const timestamp = Date.now().toString()
    const bodyStr = body ? JSON.stringify(body) : ''
    const signature = this.generateSignature(method, path, bodyStr, timestamp)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      client_id: this.config.clientId,
      sign: signature,
      t: timestamp,
      sign_method: 'HMAC-SHA256',
    }

    if (this.accessToken) {
      headers.access_token = this.accessToken
    }

    const url = `${this.baseUrl}${path}`
    const options: RequestInit = {
      method,
      headers,
    }

    if (body) {
      options.body = bodyStr
    }

    const response = await fetch(url, options)
    const data = await response.json()

    if (!data.success) {
      throw new Error(`Tuya API Error: ${data.msg || data.code || 'Unknown error'}`)
    }

    return data as T
  }

  /**
   * Get access token (cached)
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    // Request new token
    const response = await this.makeRequest<TuyaTokenResponse>(
      'GET',
      '/v1.0/token?grant_type=1'
    )

    this.accessToken = response.result.access_token
    // Tuya returns expire_time in seconds, convert to milliseconds
    this.tokenExpiry = Date.now() + (response.result.expire_time * 1000)

    return this.accessToken
  }

  /**
   * Get device current status
   */
  async getDeviceStatus(): Promise<Record<string, any>> {
    await this.getAccessToken()

    const response = await this.makeRequest<TuyaDeviceStatusResponse>(
      'GET',
      `/v1.0/devices/${this.config.deviceId}/status`
    )

    // Convert array of {code, value} to object
    const status: Record<string, any> = {}
    response.result.forEach(item => {
      status[item.code] = item.value
    })

    return status
  }

  /**
   * Get device logs (historical status changes)
   * This can help track when the device was on/off
   */
  async getDeviceLogs(startTime: number, endTime: number): Promise<any[]> {
    await this.getAccessToken()

    try {
      const response = await this.makeRequest<TuyaDeviceLogsResponse>(
        'GET',
        `/v1.0/devices/${this.config.deviceId}/logs?start_time=${startTime}&end_time=${endTime}&type=7`
      )

      return response.result?.list || []
    } catch (error) {
      console.error('Failed to get device logs:', error)
      return []
    }
  }

  /**
   * Get device energy consumption statistics using Tuya Energy Management API
   * @param startTime Start time in format yyyyMMdd (for day) or yyyyMMddHH (for hour)
   * @param endTime End time in same format as startTime
   * @param statisticsType Type of statistics: 'day', 'hour', or 'month'
   */
  async getDeviceStatistics(
    startTime: string,
    endTime: string,
    statisticsType: 'day' | 'hour' | 'month' = 'day'
  ): Promise<number> {
    await this.getAccessToken()

    try {
      // Use the Energy Management API endpoint
      const params = new URLSearchParams({
        energy_action: 'consume',
        statistics_type: statisticsType,
        start_time: startTime,
        end_time: endTime,
        contain_childs: 'false',
        device_ids: this.config.deviceId
      })

      const response = await this.makeRequest<TuyaStatisticsResponse>(
        'GET',
        `/v1.0/iot-03/energy/electricity/device/nodes/statistics-sum?${params.toString()}`
      )

      // The result is already in kWh
      return response.result || 0
    } catch (error) {
      console.error('Failed to get energy statistics:', error)
      return 0
    }
  }

  /**
   * Try to get cumulative energy from device status
   * Some Tuya smart plugs report cumulative energy in the add_ele field
   */
  async getCumulativeEnergy(): Promise<number | null> {
    try {
      const status = await this.getDeviceStatus()

      // Check for add_ele field (cumulative energy)
      if ('add_ele' in status && status.add_ele !== null && status.add_ele !== undefined) {
        // add_ele is typically in 0.001 kWh units (need to divide by 100 or 1000 depending on device)
        // This varies by device, so we'll return the raw value and let caller handle it
        return Number(status.add_ele)
      }

      return null
    } catch (error) {
      console.error('Failed to get cumulative energy:', error)
      return null
    }
  }

  /**
   * Get comprehensive energy data for a specific date
   * Tries multiple methods and returns the best available data
   */
  async getEnergyDataForDate(date: string): Promise<TuyaEnergyData> {
    const dateObj = new Date(date)
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    const formattedDate = `${year}${month}${day}`

    // Method 1: Try Energy Management API (most accurate)
    try {
      const energyKwh = await this.getDeviceStatistics(formattedDate, formattedDate, 'day')

      if (energyKwh > 0) {
        return {
          energy_kwh: energyKwh,
          cost: this.calculateChargingCost(energyKwh),
          source: 'energy_api',
          confidence: 'high',
          message: 'Data retrieved from Tuya Energy Management API'
        }
      }
    } catch (error) {
      console.log('Energy Management API not available or returned no data')
    }

    // Method 2: Try to use device logs to estimate energy usage
    try {
      const startTime = Math.floor(dateObj.getTime() / 1000)
      const endTime = startTime + (24 * 60 * 60) // Add 24 hours

      const logs = await this.getDeviceLogs(startTime, endTime)

      if (logs.length > 0) {
        // Check if logs contain power/energy data
        let totalPower = 0
        let samples = 0

        logs.forEach(log => {
          const powerStatus = log.status?.find((s: any) => s.code === 'cur_power')
          if (powerStatus && powerStatus.value > 0) {
            totalPower += powerStatus.value
            samples++
          }
        })

        if (samples > 0) {
          // Rough estimation: average power × time
          // cur_power is in 0.1W units typically
          const avgPower = (totalPower / samples) / 10 // Convert to Watts
          const estimatedKwh = (avgPower * 24) / 1000 // Rough daily estimate

          return {
            energy_kwh: estimatedKwh,
            cost: this.calculateChargingCost(estimatedKwh),
            source: 'device_logs',
            confidence: 'low',
            message: 'Estimated from device logs (may be inaccurate)',
            raw_value: { avgPower, samples }
          }
        }
      }
    } catch (error) {
      console.log('Device logs not available')
    }

    // No data available
    return {
      energy_kwh: 0,
      cost: 0,
      source: 'manual',
      confidence: 'low',
      message: 'No energy data available. Please enter manually or check if device was actively charging on this date.'
    }
  }

  /**
   * Get energy consumption for a specific date (backward compatible)
   * @param date Date string in format YYYY-MM-DD
   */
  async getEnergyForDate(date: string): Promise<number> {
    const data = await this.getEnergyDataForDate(date)
    return data.energy_kwh
  }

  /**
   * Calculate charging cost based on energy consumption
   * @param energyKwh Energy in kilowatt-hours
   * @param rate Electricity rate per kWh (default: instance rate or $0.20/kWh)
   */
  calculateChargingCost(energyKwh: number, rate?: number): number {
    const effectiveRate = rate ?? this.electricityRate
    return energyKwh * effectiveRate
  }

  /**
   * Monitor device in real-time and detect when charging starts/stops
   * Useful for automatic data collection
   */
  async monitorChargingSession(): Promise<{
    isCharging: boolean
    currentPower: number
    switchState: boolean
  }> {
    const status = await this.getDeviceStatus()

    return {
      isCharging: status.cur_power > 0,
      currentPower: (status.cur_power || 0) / 10, // Convert to Watts
      switchState: status.switch_1 === true
    }
  }

  /**
   * Diagnostic function to test all API methods
   */
  async runDiagnostics(): Promise<{
    authentication: boolean
    deviceStatus: boolean
    energyAPI: boolean
    deviceLogs: boolean
    cumulativeEnergy: number | null
    recommendations: string[]
  }> {
    const results = {
      authentication: false,
      deviceStatus: false,
      energyAPI: false,
      deviceLogs: false,
      cumulativeEnergy: null as number | null,
      recommendations: [] as string[]
    }

    // Test authentication
    try {
      await this.getAccessToken()
      results.authentication = true
    } catch (error) {
      results.recommendations.push('Check your Tuya API credentials (CLIENT_ID, CLIENT_SECRET, DEVICE_ID)')
    }

    // Test device status
    try {
      await this.getDeviceStatus()
      results.deviceStatus = true
    } catch (error) {
      results.recommendations.push('Device status unavailable - verify device ID is correct')
    }

    // Test Energy Management API
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const energy = await this.getDeviceStatistics(today, today, 'day')
      if (energy > 0) {
        results.energyAPI = true
      } else {
        results.recommendations.push('Energy Management API is accessible but returned no data. This might be normal if no charging occurred today.')
      }
    } catch (error) {
      results.recommendations.push('Energy Management API is not available. Please subscribe to this service in Tuya IoT Platform: Cloud → Cloud Services → Energy Management')
    }

    // Test device logs
    try {
      const now = Math.floor(Date.now() / 1000)
      const logs = await this.getDeviceLogs(now - 3600, now) // Last hour
      results.deviceLogs = logs.length > 0
    } catch (error) {
      results.recommendations.push('Device logs not available')
    }

    // Test cumulative energy
    try {
      results.cumulativeEnergy = await this.getCumulativeEnergy()
      if (results.cumulativeEnergy !== null) {
        results.recommendations.push(`Device reports cumulative energy: ${results.cumulativeEnergy} (raw value - units may vary by device)`)
      }
    } catch (error) {
      // Not critical
    }

    return results
  }
}

/**
 * Create Tuya API client from environment variables
 */
export function createTuyaClient(): TuyaAPI {
  const config: TuyaConfig = {
    clientId: process.env.TUYA_CLIENT_ID!,
    clientSecret: process.env.TUYA_CLIENT_SECRET!,
    deviceId: process.env.TUYA_DEVICE_ID!,
    dataCenter: process.env.TUYA_DATA_CENTER || 'us',
  }

  if (!config.clientId || !config.clientSecret || !config.deviceId) {
    throw new Error('Missing required Tuya configuration in environment variables')
  }

  return new TuyaAPI(config)
}
