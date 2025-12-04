'use server'

import { revalidatePath } from 'next/cache'
import { JournalEntryCreate, JournalEntryUpdate, JournalFilters } from '@/types/journal'
import * as journalStore from '@/lib/db/journal-store'

/**
 * Create a new journal entry
 */
export async function createJournalEntryAction(data: JournalEntryCreate) {
  try {
    const entry = await journalStore.createJournalEntry(data)
    revalidatePath('/journal')
    return entry
  } catch (error) {
    console.error('Failed to create journal entry:', error)
    throw new Error('Failed to create journal entry')
  }
}

/**
 * Get journal entries with optional filters and pagination
 */
export async function getJournalEntriesAction(
  filters?: JournalFilters,
  page: number = 1,
  limit: number = 20,
) {
  try {
    const { entries, total } = await journalStore.getJournalEntries(filters, page, limit)
    return { entries, total }
  } catch (error) {
    console.error('Failed to fetch journal entries:', error)
    throw new Error('Failed to fetch journal entries')
  }
}

/**
 * Get a single journal entry by ID
 */
export async function getJournalEntryAction(id: number) {
  try {
    const entry = await journalStore.getJournalEntry(id)
    if (!entry) {
      throw new Error('Journal entry not found')
    }
    return entry
  } catch (error) {
    console.error('Failed to fetch journal entry:', error)
    throw new Error('Failed to fetch journal entry')
  }
}

/**
 * Update a journal entry
 */
export async function updateJournalEntryAction(id: number, data: JournalEntryUpdate) {
  try {
    const entry = await journalStore.updateJournalEntry(id, data)
    revalidatePath('/journal')
    revalidatePath(`/journal/${id}`)
    return entry
  } catch (error) {
    console.error('Failed to update journal entry:', error)
    throw new Error('Failed to update journal entry')
  }
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntryAction(id: number) {
  try {
    await journalStore.deleteJournalEntry(id)
    revalidatePath('/journal')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete journal entry:', error)
    throw new Error('Failed to delete journal entry')
  }
}

/**
 * Get aggregated statistics about journal entries
 */
export async function getJournalStatsAction() {
  try {
    const stats = await journalStore.getJournalStats()
    return stats
  } catch (error) {
    console.error('Failed to fetch journal stats:', error)
    throw new Error('Failed to fetch journal stats')
  }
}

/**
 * Get calendar data for a specific month/year
 * Returns which days have entries and how many
 */
export async function getCalendarDataAction(year: number, month: number) {
  try {
    const calendarData = await journalStore.getCalendarData(year, month)
    return calendarData
  } catch (error) {
    console.error('Failed to fetch calendar data:', error)
    throw new Error('Failed to fetch calendar data')
  }
}

/**
 * Get all available journal tags
 */
export async function getJournalTagsAction() {
  try {
    const tags = await journalStore.getJournalTags()
    return tags
  } catch (error) {
    console.error('Failed to fetch journal tags:', error)
    throw new Error('Failed to fetch journal tags')
  }
}

/**
 * Search for tags by name/query
 */
export async function searchTagsAction(query: string) {
  try {
    if (!query || query.trim().length === 0) {
      return []
    }
    const tags = await journalStore.searchTags(query)
    return tags
  } catch (error) {
    console.error('Failed to search tags:', error)
    throw new Error('Failed to search tags')
  }
}
