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
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { addCarAction, addEntryAction, updateCarDatesAction, assignEntryAction, bulkAssignAction, updateEntryAction, deleteEntryAction } from "./actions"

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
  const [editingEntry, setEditingEntry] = React.useState<PhevEntry | null>(null)
  const [editForm, setEditForm] = React.useState({
    date: '',
    cost: 0,
    km_driven: 0,
    energy_kwh: 0,
    notes: ''
  })

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

  const handleAddEntry = async (entry: { date: string; cost: number; km_driven: number; energy_kwh: number | null; notes: string }) => {
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

  const handleEditEntry = (entry: PhevEntry) => {
    setEditingEntry(entry)
    setEditForm({
      date: entry.date,
      cost: entry.cost,
      km_driven: entry.km_driven,
      energy_kwh: entry.energy_kwh || 0,
      notes: entry.notes || ''
    })
  }

  const handleUpdateEntry = async () => {
    if (!editingEntry) return

    // For unassigned entries, keep car_id as null
    // For assigned entries, preserve the existing car_id
    const carId = editingEntry.car_id || activeCarId || null

    await updateEntryAction(editingEntry.id, {
      ...editForm,
      energy_kwh: editForm.energy_kwh || null,
      car_id: carId
    })
    setEditingEntry(null)
    refreshData()
  }

  const handleDeleteEntry = async (id: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    await deleteEntryAction(id)
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
                <div key={entry.id} className="flex items-center justify-between rounded border p-2 group/entry">
                  <div>
                    <span className="font-medium">{entry.date}</span>: {entry.km_driven.toFixed(1)} km | {entry.energy_kwh ? `${entry.energy_kwh.toFixed(2)} kWh` : 'N/A'} | ${entry.cost.toFixed(2)}
                    {entry.notes && <span className="ml-2 text-sm text-muted-foreground">({entry.notes})</span>}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleEditEntry(entry)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
                    {summary.stats.totalKm.toFixed(2)} km | {summary.stats.totalEnergyKwh.toFixed(2)} kWh | ${summary.stats.totalCost.toFixed(2)} | {summary.stats.entryCount} entries
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
                                {group.totalKm.toFixed(2)} km | {group.totalEnergyKwh.toFixed(2)} kWh | ${group.totalCost.toFixed(2)} | {group.entries.length} entries
                              </span>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 pt-2">
                            <ul className="space-y-1">
                              {group.entries.map((entry) => (
                                <li key={entry.id} className="flex items-center justify-between text-sm group/entry">
                                  <span>
                                    {entry.date}: {entry.km_driven.toFixed(1)} km | {entry.energy_kwh ? `${entry.energy_kwh.toFixed(2)} kWh` : 'N/A'} | ${entry.cost.toFixed(2)}
                                    {entry.notes && ` (${entry.notes})`}
                                  </span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleEditEntry(entry)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteEntry(entry.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
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
                                {yearGroup.totalKm.toFixed(2)} km | {yearGroup.totalEnergyKwh.toFixed(2)} kWh | ${yearGroup.totalCost.toFixed(2)} | {yearGroup.entryCount} entries
                              </span>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 pt-2 space-y-2">
                            {yearGroup.months.map((monthGroup) => (
                              <div key={monthGroup.month} className="space-y-1">
                                <div className="font-medium">
                                  📅 {formatMonth(monthGroup.month)}
                                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    {monthGroup.totalKm.toFixed(2)} km | {monthGroup.totalEnergyKwh.toFixed(2)} kWh | ${monthGroup.totalCost.toFixed(2)}
                                  </span>
                                </div>
                                <ul className="pl-4 space-y-1">
                                  {monthGroup.entries.map((entry) => (
                                    <li key={entry.id} className="flex items-center justify-between text-sm group/entry">
                                      <span>
                                        {entry.date}: {entry.km_driven.toFixed(1)} km | {entry.energy_kwh ? `${entry.energy_kwh.toFixed(2)} kWh` : 'N/A'} | ${entry.cost.toFixed(2)}
                                        {entry.notes && ` (${entry.notes})`}
                                      </span>
                                      <div className="flex gap-1 opacity-0 group-hover/entry:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleEditEntry(entry)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                          onClick={() => handleDeleteEntry(entry.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
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
                      KM: {summary.stats.totalKm.toFixed(2)} | Energy: {summary.stats.totalEnergyKwh.toFixed(2)} kWh | Cost: ${summary.stats.totalCost.toFixed(2)} | Entries: {summary.stats.entryCount}
                      <br />
                      Cost per KM: ${summary.stats.costPerKm > 0 ? summary.stats.costPerKm.toFixed(4) : "N/A"} | Cost per kWh: ${summary.stats.costPerKwh > 0 ? summary.stats.costPerKwh.toFixed(3) : "N/A"} | Efficiency: {summary.stats.kwhPerKm > 0 ? (summary.stats.kwhPerKm * 100).toFixed(2) : "N/A"} kWh/100km
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>Update the details of this charging session</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-km">KM Driven</Label>
              <Input
                id="edit-km"
                type="number"
                step="0.1"
                value={editForm.km_driven}
                onChange={(e) => setEditForm({ ...editForm, km_driven: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-kwh">Energy (kWh)</Label>
              <Input
                id="edit-kwh"
                type="number"
                step="0.01"
                value={editForm.energy_kwh}
                onChange={(e) => setEditForm({ ...editForm, energy_kwh: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cost">Cost ($)</Label>
              <Input
                id="edit-cost"
                type="number"
                step="0.01"
                value={editForm.cost}
                onChange={(e) => setEditForm({ ...editForm, cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingEntry(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEntry}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
