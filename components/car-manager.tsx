"use client"

import * as React from "react"
import { Car } from "@/types/phev"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface CarManagerProps {
  cars: Car[]
  activeCarId: number | null
  onAddCar: () => Promise<void>
  onUpdateCarDates: (carId: number, startDate: string | null, endDate: string | null) => Promise<void>
}

export function CarManager({ cars, activeCarId, onAddCar, onUpdateCarDates }: CarManagerProps) {
  const [carDateDrafts, setCarDateDrafts] = React.useState<Record<number, { start: Date | null; end: Date | null }>>({})
  const [savingCarId, setSavingCarId] = React.useState<number | null>(null)

  React.useEffect(() => {
    const drafts: Record<number, { start: Date | null; end: Date | null }> = {}
    cars.forEach((car) => {
      drafts[car.id] = {
        start: car.start_date ? new Date(car.start_date) : null,
        end: car.end_date ? new Date(car.end_date) : null
      }
    })
    setCarDateDrafts(drafts)
  }, [cars])

  const handleSaveCarDates = async (carId: number) => {
    const draft = carDateDrafts[carId]
    if (!draft) return

    setSavingCarId(carId)

    try {
      await onUpdateCarDates(
        carId,
        draft.start ? format(draft.start, "yyyy-MM-dd") : null,
        draft.end ? format(draft.end, "yyyy-MM-dd") : null
      )
    } finally {
      setSavingCarId(null)
    }
  }

  if (cars.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Car Timeline</CardTitle>
        <CardDescription>Track when each vehicle was active</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {cars.map((car) => {
            const draft = carDateDrafts[car.id] || { start: null, end: null }
            const saving = savingCarId === car.id
            const isActive = activeCarId === car.id

            return (
              <div
                key={car.id}
                className="flex flex-wrap items-center gap-4 border-t pt-4 first:border-t-0 first:pt-0"
              >
                <div className="min-w-[160px] font-semibold">
                  {car.name}
                  {isActive && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      (Active)
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Added</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
                          !draft.start && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {draft.start ? format(draft.start, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={draft.start || undefined}
                        onSelect={(date) =>
                          setCarDateDrafts({
                            ...carDateDrafts,
                            [car.id]: { ...draft, start: date || null }
                          })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Replaced</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
                          !draft.end && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {draft.end ? format(draft.end, "PPP") : "Still active"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={draft.end || undefined}
                        onSelect={(date) =>
                          setCarDateDrafts({
                            ...carDateDrafts,
                            [car.id]: { ...draft, end: date || null }
                          })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveCarDates(car.id)}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Dates"}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
