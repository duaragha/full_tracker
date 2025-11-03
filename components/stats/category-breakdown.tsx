import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface CategoryData {
  label: string
  value: number
  percentage: number
  color: string
}

interface CategoryBreakdownProps {
  data: CategoryData[]
  title?: string
  description?: string
}

export function CategoryBreakdown({
  data,
  title = "Category Breakdown",
  description = "Distribution across categories"
}: CategoryBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{item.value.toFixed(1)}h</span>
                  <span className="font-semibold min-w-[3rem] text-right">{item.percentage}%</span>
                </div>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
