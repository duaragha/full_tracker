import { PhevStats } from "@/types/phev"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PhevStatsProps {
  stats: PhevStats
}

export function PhevStatsCards({ stats }: PhevStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>{stats.totalKm.toFixed(2)}</CardTitle>
          <CardDescription>Total KM</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>${stats.totalCost.toFixed(2)}</CardTitle>
          <CardDescription>Total Cost</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>${stats.costPerKm.toFixed(4)}</CardTitle>
          <CardDescription>Cost per KM</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{stats.entryCount}</CardTitle>
          <CardDescription>Total Entries</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
