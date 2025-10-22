"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"

interface PhevEntryFormProps {
  activeCarId: number | null
  onSubmit: (entry: {
    date: string
    cost: number
    km_driven: number
    energy_kwh: number | null
    notes: string
  }) => Promise<void>
}

export function PhevEntryForm({ activeCarId, onSubmit }: PhevEntryFormProps) {
  const [formData, setFormData] = React.useState({
    date: null as Date | null,
    cost: "",
    km_driven: "",
    energy_kwh: "",
    notes: ""
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isFetchingTuya, setIsFetchingTuya] = React.useState(false)
  const [tuyaError, setTuyaError] = React.useState<string | null>(null)

  // Fetch charging data from Tuya API when date changes
  React.useEffect(() => {
    const fetchTuyaData = async () => {
      if (!formData.date) return

      setIsFetchingTuya(true)
      setTuyaError(null)
      try {
        const response = await fetch('/api/tuya/charging-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: format(formData.date, 'yyyy-MM-dd'),
            electricityRate: 0.20 // Default rate, can be made configurable
          })
        })

        const data = await response.json()

        if (data.success) {
          setFormData(prev => ({
            ...prev,
            cost: data.data.cost.toString(),
            energy_kwh: data.data.energy_kwh.toString()
          }))

          // Show message if no data available but API worked
          if (data.message) {
            setTuyaError(data.message)
          } else {
            setTuyaError(null)
          }
        } else {
          console.error('Failed to fetch Tuya data:', data.error)
          setTuyaError(data.message || data.error || 'Failed to fetch data from smart plug')
        }
      } catch (error) {
        console.error('Error fetching Tuya data:', error)
        setTuyaError('Failed to connect to smart plug API')
      } finally {
        setIsFetchingTuya(false)
      }
    }

    fetchTuyaData()
  }, [formData.date])

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
        energy_kwh: formData.energy_kwh ? parseFloat(formData.energy_kwh) : null,
        notes: formData.notes
      })

      // Clear form
      setFormData({
        date: null,
        cost: "",
        km_driven: "",
        energy_kwh: "",
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
      {tuyaError && (
        <div className={`border rounded-md p-3 ${
          tuyaError.includes('not been actively charging') || tuyaError.includes('not be available yet')
            ? 'bg-blue-50 border-blue-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <p className={`text-sm ${
            tuyaError.includes('not been actively charging') || tuyaError.includes('not be available yet')
              ? 'text-blue-800'
              : 'text-yellow-800'
          }`}>
            <strong>{tuyaError.includes('not been actively charging') || tuyaError.includes('not be available yet') ? 'ℹ️' : '⚠️'} Tuya API:</strong> {tuyaError}
          </p>
          <p className={`text-xs mt-1 ${
            tuyaError.includes('not been actively charging') || tuyaError.includes('not be available yet')
              ? 'text-blue-700'
              : 'text-yellow-700'
          }`}>
            You can manually enter the cost and energy values.
          </p>
        </div>
      )}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <DatePicker
            date={formData.date}
            onDateChange={(date) => setFormData({ ...formData, date })}
            placeholder="Pick entry date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost">Charging Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            disabled={isFetchingTuya}
          />
          {isFetchingTuya && <p className="text-xs text-muted-foreground">Fetching from smart plug...</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="energy_kwh">Energy (kWh)</Label>
          <Input
            id="energy_kwh"
            type="number"
            step="0.001"
            value={formData.energy_kwh}
            onChange={(e) => setFormData({ ...formData, energy_kwh: e.target.value })}
            disabled={isFetchingTuya}
            placeholder="Auto-filled from smart plug"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="km_driven">KM Driven</Label>
          <Input
            id="km_driven"
            type="number"
            step="0.1"
            value={formData.km_driven}
            onChange={(e) => setFormData({ ...formData, km_driven: e.target.value })}
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
        <Button type="submit" disabled={isSubmitting || !activeCarId} className="w-full sm:w-auto">
          {isSubmitting ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </form>
  )
}
