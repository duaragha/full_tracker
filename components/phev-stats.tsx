import { PhevStats } from "@/types/phev"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PhevStatsProps {
  stats: PhevStats
}

export function PhevStatsCards({ stats }: PhevStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4 lg:grid-cols-6">
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-lg md:text-2xl">{stats.totalKm.toFixed(2)}</CardTitle>
          <CardDescription className="text-xs md:text-sm">Total KM</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-lg md:text-2xl">${stats.totalCost.toFixed(2)}</CardTitle>
          <CardDescription className="text-xs md:text-sm">Total Cost</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-lg md:text-2xl">{stats.totalEnergyKwh.toFixed(2)} kWh</CardTitle>
          <CardDescription className="text-xs md:text-sm">Total Energy</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-lg md:text-2xl">${stats.costPerKm.toFixed(4)}</CardTitle>
          <CardDescription className="text-xs md:text-sm">Cost per KM</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-lg md:text-2xl">${stats.costPerKwh > 0 ? stats.costPerKwh.toFixed(3) : 'N/A'}</CardTitle>
          <CardDescription className="text-xs md:text-sm">Cost per kWh</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-lg md:text-2xl">{stats.kwhPerKm > 0 ? (stats.kwhPerKm * 100).toFixed(2) : 'N/A'}</CardTitle>
          <CardDescription className="text-xs md:text-sm">kWh/100km</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
