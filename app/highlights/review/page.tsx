import { getDueReviewsAction } from '@/app/actions/reviews'
import { ReviewInterface } from '@/components/review-interface'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ReviewPage() {
  const reviews = await getDueReviewsAction()

  if (reviews.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/highlights">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Highlights
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Daily Review</h1>
          <p className="text-muted-foreground mt-1">
            Reinforce your knowledge through spaced repetition
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              You've completed all your reviews for today. Great work! Come back tomorrow to
              continue building your knowledge.
            </p>
            <Button asChild>
              <Link href="/highlights">Return to Highlights</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/highlights">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Highlights
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Daily Review</h1>
        <p className="text-muted-foreground mt-1">
          Review {reviews.length} highlight{reviews.length !== 1 ? 's' : ''} to strengthen your
          memory
        </p>
      </div>

      <ReviewInterface reviews={reviews} />
    </div>
  )
}
