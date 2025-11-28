import { PhevStats } from "@/types/phev"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PhevStatsProps {
  stats: PhevStats
}

export function PhevStatsCards({ stats }: PhevStatsProps) {
  return (
    <div className="w-full grid gap-1.5 sm:gap-2 md:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      <Card>
        <CardHeader className="pb-1 sm:pb-2">
          <CardTitle className="text-base sm:text-lg">{stats.totalKm.toFixed(2)}</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">Total KM</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-1 sm:pb-2">
          <CardTitle className="text-base sm:text-lg">${stats.totalCost.toFixed(2)}</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">Total Cost</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-1 sm:pb-2">
          <CardTitle className="text-base sm:text-lg">{stats.totalEnergyKwh.toFixed(2)} kWh</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">Total Energy</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-1 sm:pb-2">
          <CardTitle className="text-base sm:text-lg">${stats.costPerKm.toFixed(4)}</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">Cost per KM</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-1 sm:pb-2">
          <CardTitle className="text-base sm:text-lg">${stats.costPerKwh > 0 ? stats.costPerKwh.toFixed(3) : 'N/A'}</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">Cost per kWh</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-1 sm:pb-2">
          <CardTitle className="text-base sm:text-lg">{stats.kwhPerKm > 0 ? (stats.kwhPerKm * 100).toFixed(2) : 'N/A'}</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">kWh/100km</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
