import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, Calendar, CheckCircle2, Flame } from 'lucide-react'

interface ReviewStatsCardProps {
  dueToday: number
  totalReviews: number
  correctReviews: number
  currentStreak: number
  nextReviewDate: string | null
}

export function ReviewStatsCard({
  dueToday,
  totalReviews,
  correctReviews,
  currentStreak,
  nextReviewDate,
}: ReviewStatsCardProps) {
  const accuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due Today</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dueToday}</div>
          <p className="text-xs text-muted-foreground">
            {dueToday === 0 ? 'All caught up!' : 'Reviews waiting'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalReviews}</div>
          <p className="text-xs text-muted-foreground">
            {accuracy}% accuracy
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Flame className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentStreak}</div>
          <p className="text-xs text-muted-foreground">
            {currentStreak === 0 ? 'Start today!' : currentStreak === 1 ? 'day' : 'days'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next Review</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {nextReviewDate
              ? new Date(nextReviewDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'None'}
          </div>
          <p className="text-xs text-muted-foreground">
            {nextReviewDate
              ? `In ${Math.ceil((new Date(nextReviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
              : 'No upcoming reviews'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
