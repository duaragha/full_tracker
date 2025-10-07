import { Area, Container, InventoryItem } from "@/types/inventory"

const AREAS_KEY = "inventory_areas"
const CONTAINERS_KEY = "inventory_containers"
const ITEMS_KEY = "inventory_items"

// Areas
export function getAreas(): Area[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(AREAS_KEY)
  return data ? JSON.parse(data) : []
}

function saveAreas(areas: Area[]) {
  localStorage.setItem(AREAS_KEY, JSON.stringify(areas))
}

export function addArea(area: Omit<Area, "id" | "createdAt" | "updatedAt">) {
  const areas = getAreas()
  const newArea: Area = {
    ...area,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  areas.push(newArea)
  saveAreas(areas)
  return newArea
}

export function updateArea(id: string, updates: Partial<Area>) {
  const areas = getAreas()
  const index = areas.findIndex((area) => area.id === id)
  if (index !== -1) {
    areas[index] = { ...areas[index], ...updates, updatedAt: new Date().toISOString() }
    saveAreas(areas)
  }
}

export function deleteArea(id: string) {
  const areas = getAreas().filter((area) => area.id !== id)
  saveAreas(areas)
  // Also delete all containers and items in this area
  const containers = getContainers().filter((c) => c.areaId !== id)
  saveContainers(containers)
  const items = getItems().filter((item) => item.location.areaId !== id)
  saveItems(items)
}

// Containers
export function getContainers(): Container[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(CONTAINERS_KEY)
  return data ? JSON.parse(data) : []
}

function saveContainers(containers: Container[]) {
  localStorage.setItem(CONTAINERS_KEY, JSON.stringify(containers))
}

export function getContainersByArea(areaId: string): Container[] {
  return getContainers().filter((c) => c.areaId === areaId)
}

export function addContainer(container: Omit<Container, "id" | "createdAt" | "updatedAt">) {
  const containers = getContainers()
  const newContainer: Container = {
    ...container,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  containers.push(newContainer)
  saveContainers(containers)
  return newContainer
}

export function updateContainer(id: string, updates: Partial<Container>) {
  const containers = getContainers()
  const index = containers.findIndex((container) => container.id === id)
  if (index !== -1) {
    containers[index] = { ...containers[index], ...updates, updatedAt: new Date().toISOString() }
    saveContainers(containers)
  }
}

export function deleteContainer(id: string) {
  const containers = getContainers().filter((container) => container.id !== id)
  saveContainers(containers)
  // Also delete all items in this container
  const items = getItems().filter((item) => item.location.containerId !== id)
  saveItems(items)
}

// Items
export function getItems(): InventoryItem[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(ITEMS_KEY)
  return data ? JSON.parse(data) : []
}

function saveItems(items: InventoryItem[]) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
}

export function getItemsByContainer(containerId: string): InventoryItem[] {
  return getItems().filter((item) => item.location.containerId === containerId)
}

export function getItemsByArea(areaId: string): InventoryItem[] {
  return getItems().filter((item) => item.location.areaId === areaId)
}

export function addItem(item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) {
  const items = getItems()
  const newItem: InventoryItem = {
    ...item,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  items.push(newItem)
  saveItems(items)
  return newItem
}

export function updateItem(id: string, updates: Partial<InventoryItem>) {
  const items = getItems()
  const index = items.findIndex((item) => item.id === id)
  if (index !== -1) {
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() }
    saveItems(items)
  }
}

export function deleteItem(id: string) {
  const items = getItems().filter((item) => item.id !== id)
  saveItems(items)
}

// Statistics
export function calculateTotalItems(items: InventoryItem[]): number {
  return items.length
}

export function calculateItemsUsedInLastYear(items: InventoryItem[]): number {
  return items.filter((item) => item.usedInLastYear).length
}

export function calculateTotalCost(items: InventoryItem[]): number {
  return items.reduce((total, item) => total + item.cost, 0)
}

export function calculateGiftsReceived(items: InventoryItem[]): number {
  return items.filter((item) => item.isGift).length
}

export function calculateItemsToDiscard(items: InventoryItem[]): number {
  const now = new Date()
  return items.filter((item) => {
    if (!item.keepUntil) return false
    return new Date(item.keepUntil) < now && !item.kept
  }).length
}
