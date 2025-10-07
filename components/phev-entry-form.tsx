"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface PhevEntryFormProps {
  activeCarId: number | null
  onSubmit: (entry: {
    date: string
    cost: number
    km_driven: number
    notes: string
  }) => Promise<void>
}

export function PhevEntryForm({ activeCarId, onSubmit }: PhevEntryFormProps) {
  const [formData, setFormData] = React.useState({
    date: null as Date | null,
    cost: "",
    km_driven: "",
    notes: ""
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activeCarId) {
      alert("Please select a car before logging charging sessions.")
      return
    }

    if (!formData.date) {
      alert("Please select a date.")
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        date: format(formData.date, "yyyy-MM-dd"),
        cost: parseFloat(formData.cost),
        km_driven: parseFloat(formData.km_driven),
        notes: formData.notes
      })

      // Clear form
      setFormData({
        date: null,
        cost: "",
        km_driven: "",
        notes: ""
      })
    } catch (error) {
      console.error("Failed to add entry:", error)
      alert("Failed to save entry. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date ? format(formData.date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.date || undefined}
                onSelect={(date) => setFormData({ ...formData, date: date || null })}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost">Charging Cost ($) *</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="km_driven">KM Driven *</Label>
          <Input
            id="km_driven"
            type="number"
            step="0.1"
            value={formData.km_driven}
            onChange={(e) => setFormData({ ...formData, km_driven: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !activeCarId}>
          {isSubmitting ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </form>
  )
}
