import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

/**
 * Calculate the keep_until date based on cost and purchase date
 * Price ranges and multipliers:
 * - $0-250: multiply by 5
 * - $251-500: multiply by 4
 * - $501-1000: multiply by 3
 * - $1001-1500: multiply by 2
 * - $1501-2000: multiply by 1.5
 * - $2001+: multiply by 1
 */
function calculateKeepUntilDate(cost: number, purchasedWhen: Date): Date {
  let multiplier = 5 // Default for $0-250

  if (cost >= 251 && cost <= 500) {
    multiplier = 4
  } else if (cost >= 501 && cost <= 1000) {
    multiplier = 3
  } else if (cost >= 1001 && cost <= 1500) {
    multiplier = 2
  } else if (cost >= 1501 && cost <= 2000) {
    multiplier = 1.5
  } else if (cost >= 2001) {
    multiplier = 1
  }

  // Calculate days to add
  const daysToAdd = Math.round(cost * multiplier)

  // Add days to purchase date
  const keepUntilDate = new Date(purchasedWhen)
  keepUntilDate.setDate(keepUntilDate.getDate() + daysToAdd)

  return keepUntilDate
}

async function updateInventoryKeepUntil() {
  let updated = 0
  let skipped = 0
  let errors = 0

  try {
    // Fetch all inventory items that have both cost and purchased_when
    const result = await pool.query(
      `SELECT id, name, cost, purchased_when, keep_until
       FROM inventory_items
       WHERE cost > 0
       AND purchased_when IS NOT NULL
       ORDER BY id`
    )

    console.log(`Found ${result.rows.length} items with cost and purchase date\n`)

    for (const item of result.rows) {
      try {
        const cost = parseFloat(item.cost)
        const purchasedWhen = new Date(item.purchased_when)
        const currentKeepUntil = item.keep_until ? new Date(item.keep_until) : null

        // Calculate new keep_until date
        const newKeepUntil = calculateKeepUntilDate(cost, purchasedWhen)

        // Update the item
        await pool.query(
          'UPDATE inventory_items SET keep_until = $1, updated_at = NOW() WHERE id = $2',
          [newKeepUntil, item.id]
        )

        const daysToKeep = Math.round(cost * getMultiplier(cost))
        console.log(
          `✓ Updated: "${item.name}" | Cost: $${cost} | Days: ${daysToKeep} | Keep Until: ${newKeepUntil.toLocaleDateString()}${
            currentKeepUntil ? ` (was: ${currentKeepUntil.toLocaleDateString()})` : ''
          }`
        )
        updated++
      } catch (error) {
        console.error(`✗ Error updating item ${item.id} (${item.name}):`, error)
        errors++
      }
    }

    console.log(`\n=== Summary ===`)
    console.log(`✓ Updated: ${updated} items`)
    console.log(`⊘ Skipped: ${skipped} items`)
    console.log(`✗ Errors: ${errors} items`)
  } catch (error) {
    console.error('✗ Fatal error:', error)
  } finally {
    await pool.end()
  }
}

function getMultiplier(cost: number): number {
  if (cost >= 251 && cost <= 500) return 4
  if (cost >= 501 && cost <= 1000) return 3
  if (cost >= 1001 && cost <= 1500) return 2
  if (cost >= 1501 && cost <= 2000) return 1.5
  if (cost >= 2001) return 1
  return 5 // Default for $0-250
}

// Run the update
updateInventoryKeepUntil()
