'use server'

import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addHighlightToCollection,
  removeHighlightFromCollection,
  getCollectionHighlights,
  getHighlightCollections,
  updateHighlightPosition,
  getCollectionStats,
  CreateCollectionDTO,
  UpdateCollectionDTO,
} from '@/lib/db/collections-store'
import { revalidatePath } from 'next/cache'

export async function getCollectionsAction(options?: {
  includeEmpty?: boolean
  sortBy?: 'name' | 'count' | 'recent' | 'order'
}) {
  return await getCollections(options)
}

export async function getCollectionByIdAction(id: number) {
  return await getCollectionById(id)
}

export async function createCollectionAction(collection: CreateCollectionDTO) {
  const result = await createCollection(collection)
  revalidatePath('/highlights')
  revalidatePath('/highlights/collections')
  return result
}

export async function updateCollectionAction(
  id: number,
  updates: UpdateCollectionDTO
) {
  await updateCollection(id, updates)
  revalidatePath('/highlights')
  revalidatePath('/highlights/collections')
  revalidatePath(`/highlights/collections/${id}`)
}

export async function deleteCollectionAction(id: number) {
  await deleteCollection(id)
  revalidatePath('/highlights')
  revalidatePath('/highlights/collections')
}

export async function addHighlightToCollectionAction(
  collectionId: number,
  highlightId: number,
  options?: {
    position?: number
    collectionNote?: string
  }
) {
  await addHighlightToCollection(collectionId, highlightId, options)
  revalidatePath('/highlights')
  revalidatePath('/highlights/collections')
  revalidatePath(`/highlights/collections/${collectionId}`)
}

export async function removeHighlightFromCollectionAction(
  collectionId: number,
  highlightId: number
) {
  await removeHighlightFromCollection(collectionId, highlightId)
  revalidatePath('/highlights')
  revalidatePath('/highlights/collections')
  revalidatePath(`/highlights/collections/${collectionId}`)
}

export async function getCollectionHighlightsAction(
  collectionId: number,
  options?: {
    limit?: number
    offset?: number
  }
) {
  return await getCollectionHighlights(collectionId, options)
}

export async function getHighlightCollectionsAction(highlightId: number) {
  return await getHighlightCollections(highlightId)
}

export async function updateHighlightPositionAction(
  collectionId: number,
  highlightId: number,
  position: number
) {
  await updateHighlightPosition(collectionId, highlightId, position)
  revalidatePath(`/highlights/collections/${collectionId}`)
}

export async function getCollectionStatsAction() {
  return await getCollectionStats()
}
