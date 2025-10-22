'use server'

import { InventoryItem, Container, Area, Section } from '@/types/inventory'
import {
  getAreas,
  getContainers,
  getSections,
  getSectionsByContainer,
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addContainer,
  updateContainer,
  deleteContainer,
  addSection,
  updateSection,
  deleteSection,
  addArea,
  updateArea,
  deleteArea,
  calculateTotalValue,
  calculateTotalSoldValue,
} from '@/lib/db/inventory-store'

export async function getAreasAction() {
  return await getAreas()
}

export async function getContainersAction() {
  return await getContainers()
}

export async function getInventoryItemsAction() {
  return await getInventoryItems()
}

export async function addInventoryItemAction(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return await addInventoryItem(item)
}

export async function updateInventoryItemAction(id: number, item: Partial<InventoryItem>) {
  return await updateInventoryItem(id, item)
}

export async function deleteInventoryItemAction(id: number) {
  return await deleteInventoryItem(id)
}

export async function addContainerAction(container: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>) {
  return await addContainer(container)
}

export async function updateContainerAction(id: number, container: Partial<Container>) {
  return await updateContainer(id, container)
}

export async function deleteContainerAction(id: number) {
  return await deleteContainer(id)
}

export async function getSectionsAction() {
  return await getSections()
}

export async function getSectionsByContainerAction(containerId: number) {
  return await getSectionsByContainer(containerId)
}

export async function addSectionAction(section: Omit<Section, 'id' | 'createdAt' | 'updatedAt'>) {
  return await addSection(section)
}

export async function updateSectionAction(id: number, section: Partial<Section>) {
  return await updateSection(id, section)
}

export async function deleteSectionAction(id: number) {
  return await deleteSection(id)
}

export async function addAreaAction(area: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>) {
  return await addArea(area)
}

export async function updateAreaAction(id: number, area: Partial<Area>) {
  return await updateArea(id, area)
}

export async function deleteAreaAction(id: number) {
  return await deleteArea(id)
}

export async function getInventoryStatsAction() {
  const items = await getInventoryItems()
  return {
    totalValue: calculateTotalValue(items),
    totalSoldValue: calculateTotalSoldValue(items),
  }
}
