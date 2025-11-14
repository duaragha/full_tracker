'use server'

import {
  getDueReviews,
  submitReview,
  getReviewStats,
  skipReview,
  enableReviewForHighlight,
  disableReviewForHighlight,
} from '@/lib/db/reviews-store'
import { revalidatePath } from 'next/cache'

export async function getDueReviewsAction(dueDate?: Date) {
  return await getDueReviews(dueDate)
}

export async function submitReviewAction(
  cardId: number,
  quality: number,
  timeTakenSeconds?: number
) {
  await submitReview(cardId, quality, timeTakenSeconds)
  revalidatePath('/highlights/review')
  revalidatePath('/highlights')
}

export async function getReviewStatsAction() {
  return await getReviewStats()
}

export async function skipReviewAction(cardId: number) {
  await skipReview(cardId)
  revalidatePath('/highlights/review')
  revalidatePath('/highlights')
}

export async function enableReviewForHighlightAction(highlightId: number) {
  await enableReviewForHighlight(highlightId)
  revalidatePath('/highlights')
}

export async function disableReviewForHighlightAction(highlightId: number) {
  await disableReviewForHighlight(highlightId)
  revalidatePath('/highlights')
}
