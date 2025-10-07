"use client"

import * as React from "react"
import { Car, CarSummary, PhevEntry, PhevStats } from "@/types/phev"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { PhevEntryForm } from "@/components/phev-entry-form"
import { CarManager } from "@/components/car-manager"
import { PhevStatsCards } from "@/components/phev-stats"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import { addCarAction, addEntryAction, updateCarDatesAction, assignEntryAction, bulkAssignAction } from "./actions"

interface PhevClientProps {
  initialCars: Car[]
  initialCarSummaries: CarSummary[]
  initialUnassigned: PhevEntry[]
  initialAllTimeStats: PhevStats
}

export function PhevClient({ initialCars, initialCarSummaries, initialUnassigned, initialAllTimeStats }: PhevClientProps) {
  const [cars, setCars] = React.useState(initialCars)
  const [carSummaries, setCarSummaries] = React.useState(initialCarSummaries)
  const [unassigned, setUnassigned] = React.useState(initialUnassigned)
  const [allTimeStats, setAllTimeStats] = React.useState(initialAllTimeStats)
  const [activeCarId, setActiveCarId] = React.useState<number | null>(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("phevActiveCarId")
        return stored ? parseInt(stored, 10) : (cars.length > 0 ? cars[cars.length - 1].id : null)
      }
      return cars.length > 0 ? cars[cars.length - 1].id : null
    }
  )
  const [expandedMonths, setExpandedMonths] = React.useState<Set<string>>(new Set())
  const [expandedYears, setExpandedYears] = React.useState<Set<string>>(new Set())
  const [bulkAssignCarId, setBulkAssignCarId] = React.useState<number | null>(activeCarId)

  React.useEffect(() => {
    if (activeCarId && typeof window !== "undefined") {
      localStorage.setItem("phevActiveCarId", activeCarId.toString())
    }
  }, [activeCarId])

  const refreshData = () => {
    window.location.reload()
  }

  const handleAddCar = async () => {
    const name = prompt("Enter car name:")
    if (!name?.trim()) return

    await addCarAction(name.trim())
    refreshData()
  }

  const handleAddEntry = async (entry: { date: string; cost: number; km_driven: number; notes: string }) => {
    if (!activeCarId) {
      alert("Please select a car first")
      return
    }

    await addEntryAction({
      ...entry,
      car_id: activeCarId
    })
    refreshData()
  }

  const handleUpdateCarDates = async (carId: number, startDate: string | null, endDate: string | null) => {
    await updateCarDatesAction(carId, startDate, endDate)
    refreshData()
  }

  const handleAssignEntry = async (entryId: number, carId: number) => {
    await assignEntryAction(entryId, carId)
    refreshData()
  }

  const handleBulkAssign = async () => {
    if (!bulkAssignCarId || unassigned.length === 0) return

    await bulkAssignAction(
      unassigned.map(e => e.id),
      bulkAssignCarId
    )
    refreshData()
  }

  const formatMonth = (key: string) => {
    const [year, month] = key.split("-")
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`
  }

  const activeSummary = carSummaries.find(s => s.car?.id === activeCarId)
  const otherSummaries = carSummaries.filter(s => s.car?.id !== activeCarId)
  const displaySummaries = activeSummary ? [activeSummary, ...otherSummaries] : carSummaries

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">🚗🔋 PHEV Tracker</h1>
        <p className="text-muted-foreground">Track every EV-only kilometre and the cost to drive them</p>
      </div>

      {/* Stats */}
      <PhevStatsCards stats={allTimeStats} />

      {/* Active Car Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Active Car</CardTitle>
          <CardDescription>New entries will be saved for the selected car</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          {cars.length > 0 ? (
            <Select
              value={activeCarId?.toString() || ""}
              onValueChange={(value) => setActiveCarId(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a car" />
              </SelectTrigger>
              <SelectContent>
                {cars.map((car) => (
                  <SelectItem key={car.id} value={car.id.toString()}>
                    {car.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-muted-foreground">No cars yet. Add your first car to start tracking.</p>
          )}
          <Button onClick={handleAddCar}>
            <Plus className="mr-2 h-4 w-4" />
            Add Car
          </Button>
        </CardContent>
      </Card>

      {/* Car Timeline Manager */}
      <CarManager
        cars={cars}
        activeCarId={activeCarId}
        onAddCar={handleAddCar}
        onUpdateCarDates={handleUpdateCarDates}
      />

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle>Log Charging Session</CardTitle>
          <CardDescription>Add a new charging session and EV driving log</CardDescription>
        </CardHeader>
        <CardContent>
          <PhevEntryForm activeCarId={activeCarId} onSubmit={handleAddEntry} />
        </CardContent>
      </Card>

      {/* Unassigned Entries */}
      {unassigned.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Unassigned Entries</CardTitle>
                <CardDescription>
                  {unassigned.length} {unassigned.length === 1 ? "entry" : "entries"} need to be assigned to a car
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={bulkAssignCarId?.toString() || ""}
                  onValueChange={(value) => setBulkAssignCarId(parseInt(value, 10))}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select car" />
                  </SelectTrigger>
                  <SelectContent>
                    {cars.map((car) => (
                      <SelectItem key={car.id} value={car.id.toString()}>
                        {car.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleBulkAssign} disabled={!bulkAssignCarId}>
                  Assign All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassigned.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <span className="font-medium">{entry.date}</span>: ${entry.cost.toFixed(2)}, {entry.km_driven.toFixed(1)} km
                    {entry.notes && <span className="ml-2 text-sm text-muted-foreground">({entry.notes})</span>}
                  </div>
                </div>
              ))}
              {unassigned.length > 5 && (
                <p className="text-sm text-muted-foreground">...and {unassigned.length - 5} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Tabs */}
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Monthly View</TabsTrigger>
          <TabsTrigger value="yearly">Yearly View</TabsTrigger>
          <TabsTrigger value="all-time">All-Time View</TabsTrigger>
        </TabsList>

        {/* Monthly View */}
        <TabsContent value="monthly" className="space-y-4">
          {displaySummaries.map((summary) => (
            <Card key={summary.car?.id || "unassigned"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      🚗 {summary.car?.name || "Unassigned Entries"}
                      {summary.car?.id === activeCarId && (
                        <Badge variant="default" className="ml-2">Active</Badge>
                      )}
                    </CardTitle>
                    {summary.car && (
                      <CardDescription>
                        Added: {summary.car.start_date || "Unknown"} | {summary.car.end_date ? `Replaced: ${summary.car.end_date}` : "Still Active"}
                      </CardDescription>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {summary.stats.totalKm.toFixed(2)} km | ${summary.stats.totalCost.toFixed(2)} | {summary.stats.entryCount} entries
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {summary.monthlyGroups.length === 0 ? (
                  <p className="text-muted-foreground">No entries for this car</p>
                ) : (
                  <div className="space-y-2">
                    {summary.monthlyGroups.map((group) => {
                      const key = `${summary.car?.id || "unassigned"}-${group.month}`
                      const isExpanded = expandedMonths.has(key)

                      return (
                        <Collapsible key={group.month} open={isExpanded} onOpenChange={(open) => {
                          const newSet = new Set(expandedMonths)
                          if (open) newSet.add(key)
                          else newSet.delete(key)
                          setExpandedMonths(newSet)
                        }}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start font-semibold">
                              {isExpanded ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                              📆 {formatMonth(group.month)}
                              <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {group.totalKm.toFixed(2)} km | ${group.totalCost.toFixed(2)} | {group.entries.length} entries
                              </span>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 pt-2">
                            <ul className="space-y-1">
                              {group.entries.map((entry) => (
                                <li key={entry.id} className="text-sm">
                                  {entry.date}: ${entry.cost.toFixed(2)}, {entry.km_driven.toFixed(1)} km
                                  {entry.notes && ` (${entry.notes})`}
                                </li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Yearly View */}
        <TabsContent value="yearly" className="space-y-4">
          {displaySummaries.map((summary) => (
            <Card key={summary.car?.id || "unassigned"}>
              <CardHeader>
                <CardTitle>
                  🚗 {summary.car?.name || "Unassigned Entries"}
                  {summary.car?.id === activeCarId && <Badge variant="default" className="ml-2">Active</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary.yearlyGroups.length === 0 ? (
                  <p className="text-muted-foreground">No yearly data</p>
                ) : (
                  <div className="space-y-4">
                    {summary.yearlyGroups.map((yearGroup) => {
                      const key = `${summary.car?.id || "unassigned"}-year-${yearGroup.year}`
                      const isExpanded = expandedYears.has(key)

                      return (
                        <Collapsible key={yearGroup.year} open={isExpanded} onOpenChange={(open) => {
                          const newSet = new Set(expandedYears)
                          if (open) newSet.add(key)
                          else newSet.delete(key)
                          setExpandedYears(newSet)
                        }}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start text-lg font-bold">
                              {isExpanded ? <ChevronDown className="mr-2 h-5 w-5" /> : <ChevronRight className="mr-2 h-5 w-5" />}
                              🗓️ {yearGroup.year}
                              <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {yearGroup.totalKm.toFixed(2)} km | ${yearGroup.totalCost.toFixed(2)} | {yearGroup.entryCount} entries
                              </span>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 pt-2 space-y-2">
                            {yearGroup.months.map((monthGroup) => (
                              <div key={monthGroup.month} className="space-y-1">
                                <div className="font-medium">
                                  📅 {formatMonth(monthGroup.month)}
                                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    {monthGroup.totalKm.toFixed(2)} km | ${monthGroup.totalCost.toFixed(2)}
                                  </span>
                                </div>
                                <ul className="pl-4 space-y-1">
                                  {monthGroup.entries.map((entry) => (
                                    <li key={entry.id} className="text-sm">
                                      {entry.date}: ${entry.cost.toFixed(2)}, {entry.km_driven.toFixed(1)} km
                                      {entry.notes && ` (${entry.notes})`}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* All-Time View */}
        <TabsContent value="all-time">
          <Card>
            <CardHeader>
              <CardTitle>🌐 All-Time Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="text-4xl font-bold">{allTimeStats.totalKm.toFixed(2)}</div>
                  <div className="text-muted-foreground">Total KM Driven</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">${allTimeStats.totalCost.toFixed(2)}</div>
                  <div className="text-muted-foreground">Total Charging Cost</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">${allTimeStats.costPerKm.toFixed(4)}</div>
                  <div className="text-muted-foreground">Cost per KM</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">{allTimeStats.averageKmPerEntry.toFixed(2)}</div>
                  <div className="text-muted-foreground">Average KM per Entry</div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">Per-Car Breakdown</h4>
                {displaySummaries.map((summary) => (
                  <div key={summary.car?.id || "unassigned"} className="rounded border p-4">
                    <div className="font-medium">
                      🚗 {summary.car?.name || "Unassigned Entries"}
                      {summary.car?.id === activeCarId && <Badge variant="default" className="ml-2">Active</Badge>}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      KM: {summary.stats.totalKm.toFixed(2)} | Cost: ${summary.stats.totalCost.toFixed(2)} | Entries: {summary.stats.entryCount}
                      <br />
                      Cost per KM: ${summary.stats.costPerKm > 0 ? summary.stats.costPerKm.toFixed(4) : "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
