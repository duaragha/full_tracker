/**
 * Example React Components demonstrating usage of the Spaced Repetition System
 *
 * These are reference implementations showing how to integrate the review system
 * into your UI. You can copy and adapt these patterns for your application.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  getDueReviewsAction,
  submitReviewAction,
  getReviewStatsAction
} from '@/app/actions/highlights'

// ============================================
// EXAMPLE 1: Daily Review Page
// ============================================

export function DailyReviewPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadReviews()
    loadStats()
  }, [])

  async function loadReviews() {
    setLoading(true)
    try {
      const dueReviews = await getDueReviewsAction(20) // Load 20 reviews
      setReviews(dueReviews)
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const reviewStats = await getReviewStatsAction()
      setStats(reviewStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  async function handleRating(rating: number) {
    const currentReview = reviews[currentIndex]

    try {
      await submitReviewAction(currentReview.highlightId, rating)

      // Move to next review
      if (currentIndex < reviews.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setShowAnswer(false)
      } else {
        // All reviews completed
        alert('All reviews completed for today!')
        loadStats() // Refresh stats
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Failed to submit review. Please try again.')
    }
  }

  if (loading) {
    return <div className="p-8">Loading reviews...</div>
  }

  if (reviews.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">No Reviews Due Today!</h1>
        <p>Come back tomorrow for more reviews.</p>
        {stats && (
          <div className="mt-4">
            <p>Reviewed today: {stats.reviewedToday}</p>
            <p>Due this week: {stats.dueThisWeek}</p>
          </div>
        )}
      </div>
    )
  }

  const currentReview = reviews[currentIndex]

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Daily Review</h1>
        <span className="text-gray-600">
          {currentIndex + 1} / {reviews.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / reviews.length) * 100}%` }}
        />
      </div>

      {/* Source information */}
      <div className="mb-4 text-sm text-gray-600">
        <p className="font-semibold">{currentReview.highlight.sourceTitle}</p>
        {currentReview.highlight.sourceAuthor && (
          <p>by {currentReview.highlight.sourceAuthor}</p>
        )}
      </div>

      {/* Highlight card */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        <p className="text-lg mb-4">{currentReview.highlight.text}</p>

        {currentReview.highlight.note && (
          <div className="mt-4 p-4 bg-gray-50 rounded border-l-4 border-blue-500">
            <p className="text-sm font-semibold mb-1">Your Note:</p>
            <p className="text-sm">{currentReview.highlight.note}</p>
          </div>
        )}
      </div>

      {/* Show Answer / Rating buttons */}
      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition"
        >
          Show Answer
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-center font-semibold mb-4">
            How well did you remember this?
          </p>

          <button
            onClick={() => handleRating(5)}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition"
          >
            Perfect (5) - Instant recall
          </button>

          <button
            onClick={() => handleRating(4)}
            className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition"
          >
            Good (4) - Correct after hesitation
          </button>

          <button
            onClick={() => handleRating(3)}
            className="w-full bg-yellow-500 text-white py-3 px-6 rounded-lg hover:bg-yellow-600 transition"
          >
            Hard (3) - Correct with difficulty
          </button>

          <button
            onClick={() => handleRating(2)}
            className="w-full bg-orange-500 text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition"
          >
            Wrong (2) - But seemed familiar
          </button>

          <button
            onClick={() => handleRating(1)}
            className="w-full bg-red-500 text-white py-3 px-6 rounded-lg hover:bg-red-600 transition"
          >
            Wrong (1) - Barely familiar
          </button>

          <button
            onClick={() => handleRating(0)}
            className="w-full bg-red-700 text-white py-3 px-6 rounded-lg hover:bg-red-800 transition"
          >
            Forgot (0) - Complete blackout
          </button>
        </div>
      )}

      {/* Review metadata */}
      <div className="mt-6 text-xs text-gray-500 text-center">
        <p>Interval: {currentReview.interval} days</p>
        <p>Easiness: {currentReview.easinessFactor}</p>
        <p>Reviews: {currentReview.reviewCount}</p>
      </div>
    </div>
  )
}

// ============================================
// EXAMPLE 2: Review Statistics Dashboard
// ============================================

export function ReviewStatsDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const reviewStats = await getReviewStatsAction()
      setStats(reviewStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading statistics...</div>
  }

  if (!stats) {
    return <div>No statistics available</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      <StatCard
        title="Due Today"
        value={stats.dueToday}
        subtitle="Ready to review"
        color="red"
      />

      <StatCard
        title="Due This Week"
        value={stats.dueThisWeek}
        subtitle="Upcoming reviews"
        color="orange"
      />

      <StatCard
        title="Reviewed Today"
        value={stats.reviewedToday}
        subtitle={`${stats.reviewedThisWeek} this week`}
        color="green"
      />

      <StatCard
        title="Total Cards"
        value={stats.totalHighlightsWithReviews}
        subtitle={`Avg difficulty: ${stats.averageEasinessFactor}`}
        color="blue"
      />

      <StatCard
        title="This Month"
        value={stats.reviewedThisMonth}
        subtitle="Reviews completed"
        color="purple"
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  color
}: {
  title: string
  value: number
  subtitle: string
  color: string
}) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
  }

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-xs opacity-75">{subtitle}</p>
    </div>
  )
}

// ============================================
// EXAMPLE 3: Simple Review Button Component
// ============================================

export function ReviewButton({
  highlightId,
  onReviewComplete
}: {
  highlightId: number
  onReviewComplete?: () => void
}) {
  const [showRating, setShowRating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleRating(rating: number) {
    setSubmitting(true)
    try {
      await submitReviewAction(highlightId, rating)
      setShowRating(false)
      onReviewComplete?.()
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (!showRating) {
    return (
      <button
        onClick={() => setShowRating(true)}
        className="text-sm text-blue-600 hover:underline"
      >
        Review Now
      </button>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleRating(5)}
        disabled={submitting}
        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
      >
        Easy
      </button>
      <button
        onClick={() => handleRating(3)}
        disabled={submitting}
        className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 disabled:opacity-50"
      >
        Hard
      </button>
      <button
        onClick={() => handleRating(1)}
        disabled={submitting}
        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
      >
        Forgot
      </button>
      <button
        onClick={() => setShowRating(false)}
        disabled={submitting}
        className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  )
}

// ============================================
// EXAMPLE 4: Review Due Badge
// ============================================

export function ReviewDueBadge() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    async function loadCount() {
      try {
        const stats = await getReviewStatsAction()
        setCount(stats.dueToday)
      } catch (error) {
        console.error('Failed to load review count:', error)
      }
    }

    loadCount()

    // Refresh every 5 minutes
    const interval = setInterval(loadCount, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (count === null || count === 0) {
    return null
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      {count} due
    </span>
  )
}

// ============================================
// EXAMPLE 5: Inline Review in Highlight List
// ============================================

export function HighlightWithReview({
  highlight,
  review,
  onReviewComplete
}: {
  highlight: any
  review: any
  onReviewComplete?: () => void
}) {
  const [showReview, setShowReview] = useState(false)

  const isDue = review && new Date(review.nextReviewAt) <= new Date()

  return (
    <div className="border rounded-lg p-4 mb-4">
      <p className="text-gray-900 mb-2">{highlight.text}</p>

      {highlight.note && (
        <p className="text-sm text-gray-600 mb-2 italic">{highlight.note}</p>
      )}

      {review && (
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
          <span>
            Next review: {new Date(review.nextReviewAt).toLocaleDateString()}
          </span>
          <span>Interval: {review.interval}d</span>
          <span>Reviews: {review.reviewCount}</span>

          {isDue && (
            <ReviewButton
              highlightId={highlight.id}
              onReviewComplete={onReviewComplete}
            />
          )}
        </div>
      )}
    </div>
  )
}
