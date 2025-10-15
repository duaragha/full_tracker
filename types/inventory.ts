export interface InventoryItem {
  id: string
  name: string
  usedInLastYear: boolean // Was this item used in the last year?
  location: {
    areaId: string
    containerId: string
  }
  type: string // Category/Type of item
  cost: number
  isGift: boolean
  giftFrom: string | null
  purchasedWhere: string
  purchasedWhen: string // Date
  keepUntil: string | null // Date to keep until
  kept: boolean // Still kept/owned?
  soldDate: string | null // Date when sold/disposed
  soldPrice: number | null // Price sold for
  notes: string
  photo?: string // Base64 or URL
  parentItemId?: string | null // Reference to parent item for nested structures (e.g., GPU within PC)
  children?: InventoryItem[] // Child items when fetched with hierarchy
  createdAt: string
  updatedAt: string
}

export interface Container {
  id: string
  name: string // "Box 1", "Backpack", "Drawer 2"
  type: string // Box, Bag, Drawer, Shelf, Bin
  color?: string
  areaId: string
  // Tracking fields
  brand?: string // Brand/manufacturer
  model?: string // Model name/number
  material?: string // Plastic, Metal, Fabric, Wood, etc.
  size?: string // Dimensions or size category (Small, Medium, Large, XL)
  capacity?: string // Volume or capacity description
  purchasedDate?: string // When the container was purchased
  purchasedFrom?: string // Where it was bought
  cost?: number // How much it cost
  condition?: string // New, Good, Fair, Poor
  notes?: string // Additional notes
  isOwned: boolean // Whether you own it or it's borrowed/rented
  createdAt: string
  updatedAt: string
}

export interface Area {
  id: string
  name: string // "Bedroom", "Closet", "Garage"
  type: string // Room, Closet, Storage, Garage, Attic, Basement
  createdAt: string
  updatedAt: string
}
