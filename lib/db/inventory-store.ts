import { Pool } from 'pg'
import { InventoryItem, Container, Area } from '@/types/inventory'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

function normalizeInventoryItem(item: any): InventoryItem {
  return {
    id: String(item.id),
    name: item.name,
    usedInLastYear: Boolean(item.used_in_last_year),
    location: item.location || { areaId: '', containerId: '' },
    type: item.type || '',
    cost: Number(item.cost || 0),
    isGift: Boolean(item.is_gift),
    giftFrom: item.gift_from || null,
    purchasedWhere: item.purchased_where || '',
    purchasedWhen: item.purchased_when instanceof Date ? item.purchased_when.toISOString().split('T')[0] : item.purchased_when || '',
    keepUntil: item.keep_until instanceof Date ? item.keep_until.toISOString().split('T')[0] : item.keep_until,
    kept: Boolean(item.kept),
    soldDate: item.sold_date instanceof Date ? item.sold_date.toISOString().split('T')[0] : item.sold_date,
    soldPrice: item.sold_price ? Number(item.sold_price) : null,
    notes: item.notes || '',
    photo: item.photo,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

function normalizeContainer(container: any): Container {
  return {
    id: String(container.id),
    name: container.name,
    type: container.type || '',
    color: container.color,
    areaId: String(container.area_id),
    // Tracking fields
    brand: container.brand || undefined,
    model: container.model || undefined,
    material: container.material || undefined,
    size: container.size || undefined,
    capacity: container.capacity || undefined,
    purchasedDate: container.purchased_date instanceof Date
      ? container.purchased_date.toISOString().split('T')[0]
      : container.purchased_date || undefined,
    purchasedFrom: container.purchased_from || undefined,
    cost: container.cost ? Number(container.cost) : undefined,
    condition: container.condition || undefined,
    notes: container.notes || undefined,
    isOwned: container.is_owned !== null ? Boolean(container.is_owned) : true,
    createdAt: container.created_at,
    updatedAt: container.updated_at,
  }
}

function normalizeArea(area: any): Area {
  return {
    id: String(area.id),
    name: area.name,
    type: area.type || '',
    createdAt: area.created_at,
    updatedAt: area.updated_at,
  }
}

// Inventory Items
export async function getInventoryItems(): Promise<InventoryItem[]> {
  const result = await pool.query<any>(
    'SELECT * FROM inventory_items ORDER BY created_at DESC'
  )
  return result.rows.map(normalizeInventoryItem)
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
  const result = await pool.query<any>(
    `INSERT INTO inventory_items (
      name, used_in_last_year, location, type, cost, is_gift, gift_from,
      purchased_where, purchased_when, keep_until, kept, sold_date,
      sold_price, notes, photo, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
    RETURNING *`,
    [
      item.name,
      item.usedInLastYear,
      item.location,
      item.type,
      item.cost,
      item.isGift,
      item.giftFrom,
      item.purchasedWhere,
      item.purchasedWhen,
      item.keepUntil,
      item.kept,
      item.soldDate,
      item.soldPrice,
      item.notes,
      item.photo,
    ]
  )
  return normalizeInventoryItem(result.rows[0])
}

export async function updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<void> {
  await pool.query(
    `UPDATE inventory_items SET
      name = COALESCE($1, name),
      used_in_last_year = COALESCE($2, used_in_last_year),
      location = COALESCE($3, location),
      type = COALESCE($4, type),
      cost = COALESCE($5, cost),
      is_gift = COALESCE($6, is_gift),
      gift_from = $7,
      purchased_where = COALESCE($8, purchased_where),
      purchased_when = COALESCE($9, purchased_when),
      keep_until = $10,
      kept = COALESCE($11, kept),
      sold_date = $12,
      sold_price = $13,
      notes = COALESCE($14, notes),
      photo = $15,
      updated_at = NOW()
    WHERE id = $16`,
    [
      item.name,
      item.usedInLastYear,
      item.location,
      item.type,
      item.cost,
      item.isGift,
      item.giftFrom,
      item.purchasedWhere,
      item.purchasedWhen,
      item.keepUntil,
      item.kept,
      item.soldDate,
      item.soldPrice,
      item.notes,
      item.photo,
      id,
    ]
  )
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await pool.query('DELETE FROM inventory_items WHERE id = $1', [id])
}

// Containers
export async function getContainers(): Promise<Container[]> {
  const result = await pool.query<any>(
    'SELECT * FROM inventory_containers ORDER BY created_at DESC'
  )
  return result.rows.map(normalizeContainer)
}

export async function addContainer(container: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>): Promise<Container> {
  const result = await pool.query<any>(
    `INSERT INTO inventory_containers (
      name, type, color, area_id, brand, model, material, size, capacity,
      purchased_date, purchased_from, cost, condition, notes, is_owned,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
    RETURNING *`,
    [
      container.name,
      container.type,
      container.color,
      container.areaId,
      container.brand,
      container.model,
      container.material,
      container.size,
      container.capacity,
      container.purchasedDate,
      container.purchasedFrom,
      container.cost,
      container.condition,
      container.notes,
      container.isOwned !== undefined ? container.isOwned : true,
    ]
  )
  return normalizeContainer(result.rows[0])
}

export async function updateContainer(id: number, container: Partial<Container>): Promise<void> {
  await pool.query(
    `UPDATE inventory_containers SET
      name = COALESCE($1, name),
      type = COALESCE($2, type),
      color = $3,
      area_id = COALESCE($4, area_id),
      brand = $5,
      model = $6,
      material = $7,
      size = $8,
      capacity = $9,
      purchased_date = $10,
      purchased_from = $11,
      cost = $12,
      condition = $13,
      notes = $14,
      is_owned = COALESCE($15, is_owned),
      updated_at = NOW()
    WHERE id = $16`,
    [
      container.name,
      container.type,
      container.color,
      container.areaId,
      container.brand,
      container.model,
      container.material,
      container.size,
      container.capacity,
      container.purchasedDate,
      container.purchasedFrom,
      container.cost,
      container.condition,
      container.notes,
      container.isOwned,
      id,
    ]
  )
}

export async function deleteContainer(id: number): Promise<void> {
  await pool.query('DELETE FROM inventory_containers WHERE id = $1', [id])
}

// Areas
export async function getAreas(): Promise<Area[]> {
  const result = await pool.query<any>(
    'SELECT * FROM inventory_areas ORDER BY created_at DESC'
  )
  return result.rows.map(normalizeArea)
}

export async function addArea(area: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>): Promise<Area> {
  const result = await pool.query<any>(
    `INSERT INTO inventory_areas (
      name, type, created_at, updated_at
    ) VALUES ($1, $2, NOW(), NOW())
    RETURNING *`,
    [area.name, area.type]
  )
  return normalizeArea(result.rows[0])
}

export async function updateArea(id: number, area: Partial<Area>): Promise<void> {
  await pool.query(
    `UPDATE inventory_areas SET
      name = COALESCE($1, name),
      type = COALESCE($2, type),
      updated_at = NOW()
    WHERE id = $3`,
    [area.name, area.type, id]
  )
}

export async function deleteArea(id: number): Promise<void> {
  await pool.query('DELETE FROM inventory_areas WHERE id = $1', [id])
}

export function calculateTotalValue(items: InventoryItem[]): number {
  return items.filter(i => i.kept).reduce((total, item) => total + (item.cost || 0), 0)
}

export function calculateTotalSoldValue(items: InventoryItem[]): number {
  return items.filter(i => !i.kept && i.soldPrice).reduce((total, item) => total + (item.soldPrice || 0), 0)
}
