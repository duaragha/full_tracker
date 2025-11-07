import { PhevStats } from "@/types/phev"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PhevStatsProps {
  stats: PhevStats
}

export function PhevStatsCards({ stats }: PhevStatsProps) {
  return (
    <div className="w-full grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{stats.totalKm.toFixed(2)}</CardTitle>
          <CardDescription className="text-xs">Total KM</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">${stats.totalCost.toFixed(2)}</CardTitle>
          <CardDescription className="text-xs">Total Cost</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{stats.totalEnergyKwh.toFixed(2)} kWh</CardTitle>
          <CardDescription className="text-xs">Total Energy</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">${stats.costPerKm.toFixed(4)}</CardTitle>
          <CardDescription className="text-xs">Cost per KM</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">${stats.costPerKwh > 0 ? stats.costPerKwh.toFixed(3) : 'N/A'}</CardTitle>
          <CardDescription className="text-xs">Cost per kWh</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{stats.kwhPerKm > 0 ? (stats.kwhPerKm * 100).toFixed(2) : 'N/A'}</CardTitle>
          <CardDescription className="text-xs">kWh/100km</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
