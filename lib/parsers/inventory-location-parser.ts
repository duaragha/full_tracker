export interface ParsedLocation {
  area: string
  container: string
}

export function parseLocation(location: string | null | undefined): ParsedLocation {
  // Handle empty/null
  if (!location) {
    return { area: "Bedroom", container: "Misc" }
  }

  const loc = location.trim()

  // Special statuses - Archived
  if (loc.toLowerCase().includes("sold")) {
    return { area: "Archived", container: "Sold Items" }
  }
  if (loc.toLowerCase().includes("thrown out")) {
    return { area: "Archived", container: "Disposed" }
  }
  if (loc.toLowerCase().includes("given to")) {
    return { area: "Archived", container: "Given Away" }
  }

  // Wallet/Personal
  if (loc.toLowerCase().includes("wallet")) {
    return { area: "Personal", container: loc }
  }

  // Closet
  if (loc.toLowerCase().includes("closet")) {
    if (loc.toLowerCase().includes("top shelf")) {
      return { area: "Closet", container: "Top Shelf" }
    }
    return { area: "Closet", container: "General Storage" }
  }

  // Drawers
  if (loc.toLowerCase().includes("drawer")) {
    const match = loc.match(/(Left|Right)\s+Drawer\s+(\d+)/i)
    if (match) {
      return { area: "Bedroom", container: `${match[1]} Drawer ${match[2]}` }
    }
    return { area: "Bedroom", container: loc }
  }

  // Gaming keywords (PS5, Switch, TV, Wii)
  const gamingKeywords = ["ps5", "switch", "swtich", "tv", "wii", "dock"]
  if (gamingKeywords.some(keyword => loc.toLowerCase().includes(keyword))) {
    // Extract the main object, removing position prepositions
    const container = loc.replace(/^(On|Behind|Beside|Under|In|Above|Mounted above)\s+/i, "").trim()
    return { area: "Gaming Area", container: container || loc }
  }

  // Desk area (Desk, Linmon, ASUS monitor, MousePad)
  const deskKeywords = ["desk", "linmon", "asus", "mousepad", "monitor"]
  if (deskKeywords.some(keyword => loc.toLowerCase().includes(keyword))) {
    const container = loc.replace(/^(On|Under|Above|Mounted above|In Front of|Ontop of)\s+/i, "").trim()
    return { area: "Bedroom", container: container || loc }
  }

  // Wall/Room general
  if (loc.toLowerCase().includes("wall") || loc.toLowerCase().includes("around the room") || loc.toLowerCase().includes("window")) {
    return { area: "Bedroom", container: loc }
  }

  // Boxes/Cases/Storage containers
  if (loc.toLowerCase().includes("box") || loc.toLowerCase().includes("5000x") || loc.toLowerCase().includes("3 in 1")) {
    const container = loc.replace(/^(Inside|In)\s+/i, "").trim()
    return { area: "Storage", container: container || loc }
  }

  // Drawers specifically mentioned
  if (loc.toLowerCase().includes("drawer")) {
    return { area: "Bedroom", container: loc }
  }

  // Default fallback - assume Bedroom
  return { area: "Bedroom", container: loc }
}

export function normalizeItemType(type: string | null | undefined): string {
  if (!type) return "Other"

  const normalized = type.trim()

  // Handle trailing spaces
  if (normalized === "Electronic " || normalized === "Electronic") {
    return "Electronic"
  }

  // Singularize plurals
  if (normalized === "Bags") return "Bag"
  if (normalized === "Boxes") return "Box"
  if (normalized === "Candles") return "Candle"

  // Handle slash combinations - take primary type
  if (normalized.includes("/")) {
    const parts = normalized.split("/")
    return parts[0].trim()
  }

  return normalized
}

export interface InventoryImportItem {
  name: string
  type: string
  area: string
  container: string
  price: number
  isGift: boolean
  giftRecipient?: string
  purchasedWhere?: string
  purchasedWhen?: string
  keepUntil?: string
  notes?: string
}

export function parseInventoryRow(row: any): InventoryImportItem {
  const location = parseLocation(row['Location'])

  // Parse price
  let price = 0
  if (row['Cost']) {
    const priceStr = String(row['Cost']).replace(/[\$,]/g, '')
    price = parseFloat(priceStr) || 0
  }

  // Parse gift
  const isGift = row['Gift?'] && String(row['Gift?']).toLowerCase() === 'yes'

  // Parse dates
  let purchasedWhen = null
  if (row['When?']) {
    try {
      const date = new Date(row['When?'])
      if (!isNaN(date.getTime())) {
        purchasedWhen = date.toISOString().split('T')[0]
      }
    } catch (e) {
      // Invalid date, leave as null
    }
  }

  let keepUntil = null
  if (row['Keep Until']) {
    try {
      const date = new Date(row['Keep Until'])
      if (!isNaN(date.getTime())) {
        keepUntil = date.toISOString().split('T')[0]
      }
    } catch (e) {
      // Invalid date, leave as null
    }
  }

  return {
    name: row['Item'] || 'Unnamed Item',
    type: normalizeItemType(row['Type of Item']),
    area: location.area,
    container: location.container,
    price,
    isGift,
    giftRecipient: isGift ? (row['Who?'] || '') : undefined,
    purchasedWhere: row['Where?'] || '',
    purchasedWhen,
    keepUntil,
    notes: row['Notes'] || '',
  }
}
