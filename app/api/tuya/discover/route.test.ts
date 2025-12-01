/**
 * Device Discovery API Tests
 * Testing the Tuya device discovery endpoint
 */

import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock the discover module
jest.mock('tuyapi', () => ({
  discover: jest.fn(),
}))

describe('POST /api/tuya/discover', () => {
  it('should return 200 with discovered devices', async () => {
    const TuyAPI = require('tuyapi')

    TuyAPI.discover.mockResolvedValueOnce({
      devices: [
        {
          id: 'device-1',
          ip: '192.168.1.100',
          name: 'Smart Plug 1',
        },
        {
          id: 'device-2',
          ip: '192.168.1.101',
          name: 'Smart Plug 2',
        },
      ],
    })

    // Create mock request
    const request = {
      method: 'GET',
    } as NextRequest

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.devices).toHaveLength(2)
    expect(data.devices[0]).toHaveProperty('id')
    expect(data.devices[0]).toHaveProperty('ip')
  })

  it('should return 500 when discovery fails', async () => {
    const TuyAPI = require('tuyapi')

    TuyAPI.discover.mockRejectedValueOnce(new Error('Discovery timeout'))

    const request = {
      method: 'GET',
    } as NextRequest

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })

  it('should return empty list when no devices found', async () => {
    const TuyAPI = require('tuyapi')

    TuyAPI.discover.mockResolvedValueOnce({
      devices: [],
    })

    const request = {
      method: 'GET',
    } as NextRequest

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.devices).toEqual([])
  })

  it('should include device metadata in response', async () => {
    const TuyAPI = require('tuyapi')

    TuyAPI.discover.mockResolvedValueOnce({
      devices: [
        {
          id: 'bf123456789abcdef',
          ip: '192.168.1.100',
          name: 'Smart Plug',
          key: 'abcd1234efgh5678',
          productId: 'keyfwwtuvy44ch3z',
          version: '3.3',
          model: 'Wireless',
          productName: 'Smart Plug',
        },
      ],
    })

    const request = {
      method: 'GET',
    } as NextRequest

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.devices[0]).toEqual(
      expect.objectContaining({
        id: 'bf123456789abcdef',
        ip: '192.168.1.100',
        name: 'Smart Plug',
      })
    )
  })

  it('should handle discovery timeout gracefully', async () => {
    const TuyAPI = require('tuyapi')

    TuyAPI.discover.mockRejectedValueOnce(new Error('Timeout waiting for discovery'))

    const request = {
      method: 'GET',
    } as NextRequest

    const response = await GET(request)

    expect(response.status).toBe(500)
  })
})
