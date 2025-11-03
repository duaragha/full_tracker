/**
 * Statistics Cache Management
 *
 * This module provides centralized cache management for statistics.
 * In production with multiple server instances, replace with Redis.
 *
 * Usage:
 * 1. Import in your update actions
 * 2. Call invalidateStatsCache() after any data modification
 * 3. Cache automatically refreshes on next stats request
 */

export type CacheKey = 'stats' | 'timeline' | 'trends'

interface CacheEntry<T> {
  data: T
  timestamp: number
  key: string
}

// In-memory cache store
// For production multi-instance setup, use Redis instead:
// import { Redis } from '@upstash/redis'
// const redis = new Redis({ url: process.env.REDIS_URL, token: process.env.REDIS_TOKEN })
const cacheStore = new Map<string, CacheEntry<any>>()

// Cache TTL configuration (in milliseconds)
export const CACHE_CONFIG = {
  stats: 5 * 60 * 1000,      // 5 minutes for main stats
  timeline: 10 * 60 * 1000,  // 10 minutes for timeline data
  trends: 15 * 60 * 1000,    // 15 minutes for trends
} as const

/**
 * Get cached data if available and not expired
 */
export function getCached<T>(key: string, type: CacheKey = 'stats'): T | null {
  const cached = cacheStore.get(key)
  const ttl = CACHE_CONFIG[type]

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T
  }

  // Clean up expired entry
  if (cached) {
    cacheStore.delete(key)
  }

  return null
}

/**
 * Set cache data
 */
export function setCache<T>(key: string, data: T): void {
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    key,
  })
}

/**
 * Invalidate specific cache key
 */
export function invalidateCache(key: string): void {
  cacheStore.delete(key)
}

/**
 * Invalidate all stats-related caches
 * Call this after any data modification (create, update, delete)
 */
export function invalidateStatsCache(): void {
  // Clear all stats-related cache entries
  const keysToDelete: string[] = []

  cacheStore.forEach((_, key) => {
    if (key.startsWith('stats:') || key.startsWith('timeline:') || key.startsWith('trends:')) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach(key => cacheStore.delete(key))
}

/**
 * Invalidate specific category caches
 * More granular invalidation for better cache retention
 */
export function invalidateCategoryCache(category: 'games' | 'books' | 'tvshows' | 'movies' | 'phev' | 'inventory' | 'jobs'): void {
  // For now, invalidate all stats since they're aggregated
  // In a more complex system, you could track which stats depend on which categories
  invalidateStatsCache()
}

/**
 * Clear entire cache
 * Use sparingly - mainly for debugging or major data changes
 */
export function clearAllCache(): void {
  cacheStore.clear()
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  const now = Date.now()
  const entries = Array.from(cacheStore.entries())

  return {
    totalEntries: entries.length,
    byType: {
      stats: entries.filter(([k]) => k.startsWith('stats:')).length,
      timeline: entries.filter(([k]) => k.startsWith('timeline:')).length,
      trends: entries.filter(([k]) => k.startsWith('trends:')).length,
    },
    expired: entries.filter(([_, v]) => {
      const type = v.key.split(':')[0] as CacheKey
      const ttl = CACHE_CONFIG[type as keyof typeof CACHE_CONFIG] || CACHE_CONFIG.stats
      return now - v.timestamp >= ttl
    }).length,
    oldestEntry: entries.length > 0
      ? Math.min(...entries.map(([_, v]) => v.timestamp))
      : null,
    newestEntry: entries.length > 0
      ? Math.max(...entries.map(([_, v]) => v.timestamp))
      : null,
  }
}

/**
 * Cleanup expired entries periodically
 * Call this from a cron job or setInterval
 */
export function cleanupExpiredCache(): number {
  const now = Date.now()
  let removed = 0

  cacheStore.forEach((value, key) => {
    const type = key.split(':')[0] as CacheKey
    const ttl = CACHE_CONFIG[type as keyof typeof CACHE_CONFIG] || CACHE_CONFIG.stats

    if (now - value.timestamp >= ttl) {
      cacheStore.delete(key)
      removed++
    }
  })

  return removed
}

// Auto-cleanup every 10 minutes
if (typeof window === 'undefined') {
  // Only run on server-side
  setInterval(() => {
    const removed = cleanupExpiredCache()
    if (removed > 0) {
      console.log(`[Cache] Cleaned up ${removed} expired entries`)
    }
  }, 10 * 60 * 1000)
}

/**
 * Redis implementation (for production with multiple instances)
 * Uncomment and configure when ready to use Redis
 */

/*
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export async function getCachedRedis<T>(key: string, type: CacheKey = 'stats'): Promise<T | null> {
  try {
    const data = await redis.get<T>(key)
    return data
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

export async function setCacheRedis<T>(key: string, data: T, type: CacheKey = 'stats'): Promise<void> {
  try {
    const ttlSeconds = Math.floor(CACHE_CONFIG[type] / 1000)
    await redis.setex(key, ttlSeconds, data)
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

export async function invalidateCacheRedis(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Redis delete error:', error)
  }
}
*/
