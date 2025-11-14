'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { submitReviewAction, skipReviewAction } from '@/app/actions/reviews'
import { CheckCircle2, SkipForward } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReviewQueueItem } from '@/lib/db/reviews-store'

interface ReviewInterfaceProps {
  reviews: ReviewQueueItem[]
}

const QUALITY_LEVELS = [
  { value: 0, label: 'Again', color: 'destructive', description: 'Complete blackout', key: '1' },
  { value: 2, label: 'Hard', color: 'orange', description: 'Difficult to recall', key: '2' },
  { value: 3, label: 'Good', color: 'blue', description: 'Recalled with effort', key: '3' },
  { value: 4, label: 'Easy', color: 'green', description: 'Easy to recall', key: '4' },
  { value: 5, label: 'Perfect', color: 'purple', description: 'Instant recall', key: '5' },
] as const

export function ReviewInterface({ reviews }: ReviewInterfaceProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [completedCount, setCompletedCount] = useState(0)

  const currentReview = reviews[currentIndex]
  const progress = ((completedCount) / reviews.length) * 100

  useEffect(() => {
    setStartTime(Date.now())
    setShowNote(false)
  }, [currentIndex])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isSubmitting) return

      // Number keys 1-5 for ratings
      const key = e.key
      if (key >= '1' && key <= '5') {
        const qualityMap: Record<string, number> = {
          '1': 0,  // Again
          '2': 2,  // Hard
          '3': 3,  // Good
          '4': 4,  // Easy
          '5': 5,  // Perfect
        }
        handleRating(qualityMap[key])
      }
      // Space to show note
      else if (key === ' ' && currentReview.highlightNote && !showNote) {
        e.preventDefault()
        setShowNote(true)
      }
      // S to skip
      else if (key === 's' || key === 'S') {
        handleSkip()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isSubmitting, showNote])

  const handleRating = async (quality: number) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)

    try {
      await submitReviewAction(currentReview.cardId, quality, timeTaken)

      setCompletedCount(prev => prev + 1)

      // Move to next review or finish
      if (currentIndex < reviews.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        // All reviews completed
        router.push('/highlights')
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      await skipReviewAction(currentReview.cardId)

      if (currentIndex < reviews.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        router.push('/highlights')
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to skip review:', error)
      alert('Failed to skip review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentReview) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Review Complete!</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Great job! You've completed all {completedCount} reviews.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Review {completedCount + 1} of {reviews.length}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress)}% complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Review Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{currentReview.sourceType}</Badge>
                {currentReview.repetitions > 0 && (
                  <Badge variant="secondary">
                    Reviewed {currentReview.repetitions}x
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base text-muted-foreground">
                {currentReview.sourceTitle}
              </CardTitle>
              {currentReview.sourceAuthor && (
                <CardDescription>by {currentReview.sourceAuthor}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Highlight Text */}
          <div className="space-y-4">
            <blockquote className="border-l-4 border-primary pl-4 text-lg leading-relaxed">
              {currentReview.highlightText}
            </blockquote>

            {/* Show Note Button/Content */}
            {currentReview.highlightNote && (
              <div>
                {!showNote ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNote(true)}
                  >
                    Show Note
                  </Button>
                ) : (
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium mb-2">Your Note:</p>
                    <p className="text-sm text-muted-foreground">
                      {currentReview.highlightNote}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rating Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">How well did you remember this?</p>
            <div className="grid grid-cols-5 gap-2">
              {QUALITY_LEVELS.map(({ value, label, color, description, key }) => (
                <Button
                  key={value}
                  onClick={() => handleRating(value)}
                  disabled={isSubmitting}
                  variant={color === 'destructive' ? 'destructive' : 'outline'}
                  className={`h-auto flex-col py-3 relative ${
                    color === 'orange'
                      ? 'border-orange-500 hover:bg-orange-500/10'
                      : color === 'blue'
                      ? 'border-blue-500 hover:bg-blue-500/10'
                      : color === 'green'
                      ? 'border-green-500 hover:bg-green-500/10'
                      : color === 'purple'
                      ? 'border-purple-500 hover:bg-purple-500/10'
                      : ''
                  }`}
                >
                  <kbd className="absolute top-1 right-1 text-xs opacity-50 bg-muted px-1 rounded">
                    {key}
                  </kbd>
                  <span className="font-semibold text-base">{label}</span>
                  <span className="text-xs text-muted-foreground mt-1 leading-tight">
                    {description}
                  </span>
                </Button>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Press 1-5 to rate, Space to show note, S to skip
            </p>
          </div>

          {/* Skip Button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Footer */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Interval: {currentReview.intervalDays} days |
          Easiness: {currentReview.easinessFactor.toFixed(2)}
        </p>
      </div>
    </div>
  )
}
