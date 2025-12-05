'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface JournalTopTagsProps {
  tags: Array<{ name: string; count: number }>
  maxTags?: number
  className?: string
}

export function JournalTopTags({
  tags,
  maxTags = 8,
  className,
}: JournalTopTagsProps) {
  const displayTags = tags.slice(0, maxTags)

  if (displayTags.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-medium">Top Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">
              No tags used yet. Add tags to your entries to see them here!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-medium">Top Tags</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayTags.map((tag) => (
            <div
              key={tag.name}
              className="flex items-center justify-between"
            >
              <span className="text-sm">#{tag.name}</span>
              <span className="text-sm text-muted-foreground">{tag.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
