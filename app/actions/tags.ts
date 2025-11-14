'use server'

import {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  mergeTags,
  getTagStats,
  CreateTagDTO,
  UpdateTagDTO,
} from '@/lib/db/tags-store'
import { revalidatePath } from 'next/cache'

export async function getTagsAction(options?: {
  includeEmpty?: boolean
  sortBy?: 'name' | 'count' | 'recent'
}) {
  return await getTags(options)
}

export async function getTagByIdAction(id: number) {
  return await getTagById(id)
}

export async function createTagAction(tag: CreateTagDTO) {
  const result = await createTag(tag)
  revalidatePath('/highlights')
  revalidatePath('/highlights/tags')
  return result
}

export async function updateTagAction(id: number, updates: UpdateTagDTO) {
  await updateTag(id, updates)
  revalidatePath('/highlights')
  revalidatePath('/highlights/tags')
}

export async function deleteTagAction(id: number) {
  await deleteTag(id)
  revalidatePath('/highlights')
  revalidatePath('/highlights/tags')
}

export async function mergeTagsAction(sourceTagId: number, targetTagId: number) {
  await mergeTags(sourceTagId, targetTagId)
  revalidatePath('/highlights')
  revalidatePath('/highlights/tags')
}

export async function getTagStatsAction() {
  return await getTagStats()
}
