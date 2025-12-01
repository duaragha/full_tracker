/**
 * TuyaLocalAPI Unit Tests
 * Testing the local API client for Tuya device control
 *
 * Using mocked tuyapi library to test without actual hardware
 */

import { TuyaLocalAPI } from './tuya-local'

// Mock the tuyapi library
jest.mock('tuyapi', () => {
  return jest.fn().mockImplementation(function (this: any, config: any) {
    // Mock device with basic methods
    this.on = jest.fn()
    this.find = jest.fn().mockResolvedValue(true)
    this.get = jest.fn().mockResolvedValue({
      1: true, // Switch state
      18: 854, // Current in mA (0.854A)
      19: 1850, // Power W×10 (185W)
      20: 2410, // Voltage V×10 (241V)
      101: 1245, // Total energy kWh×100 (12.45kWh)
    })
    this.disconnect = jest.fn()
  })
})

describe('TuyaLocalAPI', () => {
  const mockConfig = {
    deviceId: 'test-device-id',
    localKey: 'test-local-key-32chars0000000',
    ip: '192.168.1.100',
    version: 3.3,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Constructor and Validation', () => {
    test('should create instance with valid config', () => {
      const api = new TuyaLocalAPI(mockConfig)
      expect(api).toBeDefined()
    })

    test('should throw error when deviceId is missing', () => {
      const invalidConfig = { ...mockConfig, deviceId: '' }
      expect(() => new TuyaLocalAPI(invalidConfig as any)).toThrow('deviceId is required')
    })

    test('should throw error when localKey is missing', () => {
      const invalidConfig = { ...mockConfig, localKey: '' }
      expect(() => new TuyaLocalAPI(invalidConfig as any)).toThrow('localKey is required')
    })

    test('should throw error when ip is missing', () => {
      const invalidConfig = { ...mockConfig, ip: '' }
      expect(() => new TuyaLocalAPI(invalidConfig as any)).toThrow('ip is required')
    })

    test('should have default version of 3.3 when not provided', () => {
      const config = { ...mockConfig }
      delete config.version
      const api = new TuyaLocalAPI(config as any)
      expect(api['version']).toBe(3.3)
    })
  })

  describe('Connection Management', () => {
    test('should establish connection successfully', async () => {
      const api = new TuyaLocalAPI(mockConfig)
      const result = await api.connect()
      expect(result).toBe(true)
    })

    test('should return false when connection fails', async () => {
      const api = new TuyaLocalAPI(mockConfig)

      // Mock tuyapi to throw error
      const TuyAPI = require('tuyapi')
      TuyAPI.mockImplementationOnce(function (this: any) {
        this.on = jest.fn()
        this.find = jest.fn().mockRejectedValueOnce(new Error('Connection failed'))
        this.disconnect = jest.fn()
      })

      const failApi = new TuyaLocalAPI(mockConfig)
      const result = await failApi.connect()
      expect(result).toBe(false)
    })

    test('should disconnect gracefully', async () => {
      const api = new TuyaLocalAPI(mockConfig)
      await api.connect()
      const result = await api.disconnect()
      expect(result).toBe(true)
    })

    test('should handle disconnect when not connected', async () => {
      const api = new TuyaLocalAPI(mockConfig)
      const result = await api.disconnect()
      expect(result).toBe(true)
    })
  })

  describe('Status and Data Points', () => {
    let api: TuyaLocalAPI

    beforeEach(async () => {
      api = new TuyaLocalAPI(mockConfig)
      await api.connect()
    })

    afterEach(async () => {
      await api.disconnect()
    })

    test('should return DPS status object', async () => {
      const status = await api.getStatus()
      expect(status).toBeDefined()
      expect(typeof status).toBe('object')
    })

    test('should have correct DPS structure with switch state', async () => {
      const status = await api.getStatus()
      // Basic DPS should be present
      expect(status).toHaveProperty('1') // Switch state
      expect(status[1]).toEqual(expect.any(Boolean))
    })

    test('should parse energy data from DPS correctly', async () => {
      const energyData = await api.getEnergyData()
      expect(energyData).toBeDefined()
      expect(energyData).toHaveProperty('voltage')
      expect(energyData).toHaveProperty('current')
      expect(energyData).toHaveProperty('power')
      expect(energyData).toHaveProperty('total_kwh')
    })

    test('should return voltage in volts', async () => {
      const energyData = await api.getEnergyData()
      expect(typeof energyData.voltage).toBe('number')
      expect(energyData.voltage).toBeGreaterThan(0)
      // Mock data: 2410 / 10 = 241V
      expect(energyData.voltage).toBe(241)
    })

    test('should return current in amperes', async () => {
      const energyData = await api.getEnergyData()
      expect(typeof energyData.current).toBe('number')
      expect(energyData.current).toBeGreaterThanOrEqual(0)
      // Mock data: 854 / 1000 = 0.854A
      expect(energyData.current).toBeCloseTo(0.854)
    })

    test('should return power in watts', async () => {
      const energyData = await api.getEnergyData()
      expect(typeof energyData.power).toBe('number')
      expect(energyData.power).toBeGreaterThanOrEqual(0)
      // Mock data: 1850 / 10 = 185W
      expect(energyData.power).toBe(185)
    })

    test('should return total energy in kWh', async () => {
      const energyData = await api.getEnergyData()
      expect(typeof energyData.total_kwh).toBe('number')
      expect(energyData.total_kwh).toBeGreaterThanOrEqual(0)
      // Mock data: 1245 / 100 = 12.45kWh
      expect(energyData.total_kwh).toBe(12.45)
    })

    test('should handle DPS with zero values', async () => {
      const TuyAPI = require('tuyapi')
      TuyAPI.mockImplementationOnce(function (this: any) {
        this.on = jest.fn()
        this.find = jest.fn().mockResolvedValueOnce(true)
        this.get = jest.fn().mockResolvedValueOnce({
          1: false, // Switch off
          18: 0, // No current
          19: 0, // No power
          20: 2410, // Voltage still present
          101: 1245, // Energy accumulated
        })
        this.disconnect = jest.fn()
      })

      const zeroApi = new TuyaLocalAPI(mockConfig)
      await zeroApi.connect()
      const energyData = await zeroApi.getEnergyData()

      expect(energyData.current).toBe(0)
      expect(energyData.power).toBe(0)
      expect(energyData.voltage).toBe(241)
    })
  })

  describe('Error Handling', () => {
    test('should handle offline device gracefully', async () => {
      const TuyAPI = require('tuyapi')
      TuyAPI.mockImplementationOnce(function (this: any) {
        this.on = jest.fn()
        this.find = jest.fn().mockRejectedValueOnce(new Error('Device offline'))
        this.disconnect = jest.fn()
      })

      const offlineApi = new TuyaLocalAPI(mockConfig)
      const result = await offlineApi.connect()
      expect(result).toBe(false)
    })

    test('should provide clear error message when getStatus fails', async () => {
      const TuyAPI = require('tuyapi')
      TuyAPI.mockImplementationOnce(function (this: any) {
        this.on = jest.fn()
        this.find = jest.fn().mockResolvedValueOnce(true)
        this.get = jest.fn().mockRejectedValueOnce(new Error('Connection timeout'))
        this.disconnect = jest.fn()
      })

      const api = new TuyaLocalAPI(mockConfig)
      await api.connect()

      try {
        await api.getStatus()
        fail('Should have thrown error')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        expect(message).toContain('Failed to get device status')
      }
    })

    test('should handle invalid key gracefully', () => {
      const invalidKeyConfig = {
        ...mockConfig,
        localKey: 'invalid', // Too short
      }

      const api = new TuyaLocalAPI(invalidKeyConfig)
      expect(api).toBeDefined()
      // Validation happens at connection time in real usage
    })

    test('should handle getStatus when not connected but auto-reconnect', async () => {
      const api = new TuyaLocalAPI(mockConfig)
      // Don't explicitly connect

      // Should auto-connect when getStatus is called
      const status = await api.getStatus()
      expect(status).toBeDefined()
      expect(typeof status).toBe('object')
    })
  })

  describe('Data Format and Accuracy', () => {
    let api: TuyaLocalAPI

    beforeEach(async () => {
      api = new TuyaLocalAPI(mockConfig)
      await api.connect()
    })

    afterEach(async () => {
      await api.disconnect()
    })

    test('should handle DPS with voltage scaling (V×10)', async () => {
      const energyData = await api.getEnergyData()
      // Device returns voltage as V×10 (e.g., 2410 = 241V)
      expect(energyData.voltage).toBeLessThanOrEqual(500) // Should be in normal range
      expect(energyData.voltage).toBeGreaterThan(0)
    })

    test('should handle DPS with current in mA', async () => {
      const energyData = await api.getEnergyData()
      // Device returns current in mA (e.g., 854 = 0.854A)
      // Current should be reasonable (less than 30A typical)
      expect(energyData.current).toBeLessThan(30)
    })

    test('should handle DPS with power scaling (W×10)', async () => {
      const energyData = await api.getEnergyData()
      // Some devices return power as W×10
      expect(energyData.power).toBeGreaterThanOrEqual(0)
      // For a smart plug, power should be reasonable (less than 3500W)
      expect(energyData.power).toBeLessThan(3500)
    })

    test('should handle total energy in kWh×100', async () => {
      const energyData = await api.getEnergyData()
      // Device returns energy as kWh×100 (e.g., 1245 = 12.45kWh)
      expect(energyData.total_kwh).toBeGreaterThanOrEqual(0)
    })

    test('should handle missing DPS values gracefully', async () => {
      const TuyAPI = require('tuyapi')
      TuyAPI.mockImplementationOnce(function (this: any) {
        this.on = jest.fn()
        this.find = jest.fn().mockResolvedValueOnce(true)
        this.get = jest.fn().mockResolvedValueOnce({
          1: true, // Only has switch state
          // Missing 18, 19, 20, 101
        })
        this.disconnect = jest.fn()
      })

      const sparseApi = new TuyaLocalAPI(mockConfig)
      await sparseApi.connect()
      const energyData = await sparseApi.getEnergyData()

      // Should use default values (0) for missing DPS
      expect(energyData.current).toBe(0)
      expect(energyData.power).toBe(0)
      expect(energyData.voltage).toBe(0)
      expect(energyData.total_kwh).toBe(0)
    })
  })

  describe('Integration with Existing Patterns', () => {
    test('should provide interface compatible with API response format', async () => {
      const api = new TuyaLocalAPI(mockConfig)
      await api.connect()

      const energyData = await api.getEnergyData()

      // Should have same structure as cloud API returns
      expect(energyData).toHaveProperty('voltage')
      expect(energyData).toHaveProperty('current')
      expect(energyData).toHaveProperty('power')
      expect(energyData).toHaveProperty('total_kwh')

      await api.disconnect()
    })

    test('should support environment variable configuration', () => {
      process.env.TUYA_DEVICE_ID = 'env-device-id'
      process.env.TUYA_LOCAL_KEY = 'env-local-key-32chars0000000'
      process.env.TUYA_DEVICE_IP = '192.168.1.100'

      const api = new TuyaLocalAPI({
        deviceId: process.env.TUYA_DEVICE_ID,
        localKey: process.env.TUYA_LOCAL_KEY,
        ip: process.env.TUYA_DEVICE_IP,
      })

      expect(api).toBeDefined()

      // Cleanup
      delete process.env.TUYA_DEVICE_ID
      delete process.env.TUYA_LOCAL_KEY
      delete process.env.TUYA_DEVICE_IP
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle multiple connect calls', async () => {
      const api = new TuyaLocalAPI(mockConfig)
      const result1 = await api.connect()
      const result2 = await api.connect()

      expect(result1).toBe(true)
      expect(result2).toBe(true)

      await api.disconnect()
    })

    test('should handle rapid get calls', async () => {
      const api = new TuyaLocalAPI(mockConfig)
      await api.connect()

      const promises = [
        api.getStatus(),
        api.getStatus(),
        api.getStatus(),
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
      expect(results.every(r => typeof r === 'object')).toBe(true)

      await api.disconnect()
    })

    test('should handle large cumulative energy values', async () => {
      const TuyAPI = require('tuyapi')
      TuyAPI.mockImplementationOnce(function (this: any) {
        this.on = jest.fn()
        this.find = jest.fn().mockResolvedValueOnce(true)
        this.get = jest.fn().mockResolvedValueOnce({
          1: true,
          18: 854,
          19: 1850,
          20: 2410,
          101: 999999, // Large value: 9999.99 kWh
        })
        this.disconnect = jest.fn()
      })

      const api = new TuyaLocalAPI(mockConfig)
      await api.connect()
      const energyData = await api.getEnergyData()

      expect(energyData.total_kwh).toBe(9999.99)
      await api.disconnect()
    })
  })
})
