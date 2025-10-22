import { PhevStats } from "@/types/phev"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PhevStatsProps {
  stats: PhevStats
}

export function PhevStatsCards({ stats }: PhevStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
          <CardTitle>{stats.totalEnergyKwh.toFixed(2)} kWh</CardTitle>
          <CardDescription>Total Energy</CardDescription>
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
          <CardTitle>${stats.costPerKwh > 0 ? stats.costPerKwh.toFixed(3) : 'N/A'}</CardTitle>
          <CardDescription>Cost per kWh</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{stats.kwhPerKm > 0 ? (stats.kwhPerKm * 100).toFixed(2) : 'N/A'}</CardTitle>
          <CardDescription>kWh/100km</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
