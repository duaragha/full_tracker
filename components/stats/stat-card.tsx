import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrendData {
  direction: "up" | "down" | "neutral"
  value: string
}

interface StatCardProps {
  label: string
  value: string | number
  trend?: TrendData
  icon?: LucideIcon
  className?: string
}

export function StatCard({ label, value, trend, icon: Icon, className }: StatCardProps) {
  const trendIcon =
    trend?.direction === "up" ? TrendingUp :
    trend?.direction === "down" ? TrendingDown :
    Minus

  const TrendIcon = trendIcon

  const trendColor =
    trend?.direction === "up"
      ? "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900/30"
      : trend?.direction === "down"
      ? "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/30"
      : "text-muted-foreground"

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardDescription className="text-xs font-medium">
            {label}
          </CardDescription>
          {trend && (
            <Badge variant="outline" className={cn("text-[10px] h-5 gap-0.5", trendColor)}>
              <TrendIcon className="w-3 h-3" />
              {trend.value}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
          <CardTitle className="text-2xl font-bold">{value}</CardTitle>
        </div>
      </CardHeader>
    </Card>
  )
}
