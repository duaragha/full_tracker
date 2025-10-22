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

export class TuyaAPI {
  private config: TuyaConfig
  private accessToken: string | null = null
  private tokenExpiry: number | null = null
  private baseUrl: string

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
      throw new Error(`Tuya API Error: ${data.msg || 'Unknown error'}`)
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
   * Get energy consumption for a specific date
   * @param date Date string in format YYYY-MM-DD
   */
  async getEnergyForDate(date: string): Promise<number> {
    // Convert date to Tuya format: yyyyMMdd
    const dateObj = new Date(date)
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    const formattedDate = `${year}${month}${day}`

    try {
      // Try the Energy Management API first
      return await this.getDeviceStatistics(formattedDate, formattedDate, 'day')
    } catch (error) {
      // If Energy Management API is not subscribed, return 0
      // User will need to manually enter the value or subscribe to the API
      console.error('Energy Management API not available. Please subscribe to this service in Tuya IoT Platform.')
      return 0
    }
  }

  /**
   * Calculate charging cost based on energy consumption
   * @param energyKwh Energy in kilowatt-hours
   * @param rate Electricity rate per kWh (default: $0.20/kWh)
   */
  calculateChargingCost(energyKwh: number, rate: number = 0.20): number {
    return energyKwh * rate
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
