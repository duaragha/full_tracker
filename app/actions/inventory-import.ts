'use server'

import { Pool } from 'pg'
import { InventoryImportItem } from '@/lib/parsers/inventory-location-parser'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export async function bulkImportInventoryAction(items: InventoryImportItem[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
    areasCreated: 0,
    containersCreated: 0,
  }

  try {
    // Step 1: Collect unique areas and containers
    const areaSet = new Set(items.map(i => i.area))
    const containerMap = new Map<string, string>() // container name -> area name

    items.forEach(item => {
      const key = `${item.area}:${item.container}`
      if (!containerMap.has(key)) {
        containerMap.set(key, item.area)
      }
    })

    // Step 2: Create areas (check if exists first)
    const areaIds = new Map<string, number>()

    for (const areaName of areaSet) {
      try {
        // Check if area exists
        const existing = await pool.query(
          'SELECT id FROM areas WHERE name = $1',
          [areaName]
        )

        if (existing.rows.length > 0) {
          areaIds.set(areaName, existing.rows[0].id)
        } else {
          // Create new area
          const result = await pool.query(
            'INSERT INTO areas (name) VALUES ($1) RETURNING id',
            [areaName]
          )
          areaIds.set(areaName, result.rows[0].id)
          results.areasCreated++
        }
      } catch (error) {
        results.errors.push(`Failed to create area "${areaName}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Step 3: Create containers (check if exists first)
    const containerIds = new Map<string, number>()

    for (const [key, areaName] of containerMap.entries()) {
      const containerName = key.split(':')[1]
      const areaId = areaIds.get(areaName)

      if (!areaId) {
        results.errors.push(`Could not find area ID for "${areaName}"`)
        continue
      }

      try {
        // Check if container exists in this area
        const existing = await pool.query(
          'SELECT id FROM containers WHERE name = $1 AND area_id = $2',
          [containerName, areaId]
        )

        if (existing.rows.length > 0) {
          containerIds.set(key, existing.rows[0].id)
        } else {
          // Create new container
          const result = await pool.query(
            'INSERT INTO containers (name, area_id) VALUES ($1, $2) RETURNING id',
            [containerName, areaId]
          )
          containerIds.set(key, result.rows[0].id)
          results.containersCreated++
        }
      } catch (error) {
        results.errors.push(`Failed to create container "${containerName}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Step 4: Import items
    for (const item of items) {
      const key = `${item.area}:${item.container}`
      const areaId = areaIds.get(item.area)
      const containerId = containerIds.get(key)

      if (!areaId || !containerId) {
        results.failed++
        results.errors.push(`Could not find area/container for "${item.name}"`)
        continue
      }

      try {
        await pool.query(
          `INSERT INTO inventory_items (
            name, type, area_id, container_id, price, is_gift, gift_recipient,
            purchased_where, purchased_when, keep_until, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            item.name,
            item.type,
            areaId,
            containerId,
            item.price,
            item.isGift,
            item.giftRecipient || null,
            item.purchasedWhere || null,
            item.purchasedWhen || null,
            item.keepUntil || null,
            item.notes || null,
          ]
        )
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(`Failed to import "${item.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return results
  } catch (error) {
    throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function wipeInventoryAction() {
  try {
    // Delete in order: items -> containers -> areas
    await pool.query('DELETE FROM inventory_items')
    await pool.query('DELETE FROM containers')
    await pool.query('DELETE FROM areas')

    return { success: true, message: 'All inventory data cleared' }
  } catch (error) {
    throw new Error(`Wipe failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
