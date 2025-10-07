"use client"

import * as React from "react"
import { Game, GameSearchResult } from "@/types/game"
import { getGameDetails } from "@/lib/api/games"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

interface GameEntryFormProps {
  selectedGame: GameSearchResult | null
  onSubmit: (game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  initialData?: Game
}

export function GameEntryForm({ selectedGame, onSubmit, onCancel, initialData }: GameEntryFormProps) {
  const [formData, setFormData] = React.useState({
    title: initialData?.title || selectedGame?.name || "",
    publisher: initialData?.publisher || selectedGame?.publishers?.[0]?.name || "",
    developer: initialData?.developer || selectedGame?.developers?.[0]?.name || "",
    genres: initialData?.genres || [],
    releaseDate: initialData?.releaseDate || selectedGame?.released || "",
    coverImage: initialData?.coverImage || selectedGame?.background_image || "",
    status: initialData?.status || "Playing" as const,
    percentage: initialData?.percentage || 0,
    dateStarted: initialData?.dateStarted ? new Date(initialData.dateStarted) : null,
    dateCompleted: initialData?.dateCompleted ? new Date(initialData.dateCompleted) : null,
    hoursPlayed: initialData?.hoursPlayed || 0,
    minutesPlayed: initialData?.minutesPlayed || 0,
    console: initialData?.console || selectedGame?.platforms?.[0]?.platform?.name || "",
    store: initialData?.store || "",
    price: initialData?.price || 0,
    notes: initialData?.notes || "",
  })

  const calculateDays = () => {
    if (!formData.dateStarted) return 0
    const end = formData.dateCompleted || new Date()
    const start = formData.dateStarted
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const daysPlayed = calculateDays()
    const totalHours = formData.hoursPlayed + formData.minutesPlayed / 60
    const pricePerHour = totalHours > 0 ? formData.price / totalHours : 0

    onSubmit({
      title: formData.title,
      publisher: formData.publisher,
      releaseDate: formData.releaseDate,
      coverImage: formData.coverImage,
      status: formData.status,
      percentage: formData.percentage,
      dateStarted: formData.dateStarted?.toISOString() || null,
      dateCompleted: formData.dateCompleted?.toISOString() || null,
      daysPlayed,
      hoursPlayed: formData.hoursPlayed,
      minutesPlayed: formData.minutesPlayed,
      console: formData.console,
      store: formData.store,
      price: formData.price,
      pricePerHour,
      developer: formData.developer,
      publisher: formData.publisher,
      genres: formData.genres,
      notes: formData.notes,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="publisher">Publisher *</Label>
          <Input
            id="publisher"
            value={formData.publisher}
            onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(value: any) => setFormData({ ...formData, status: value })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Playing">Playing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Stopped">Stopped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="console">Console/Platform *</Label>
          <Input
            id="console"
            value={formData.console}
            onChange={(e) => setFormData({ ...formData, console: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Progress: {formData.percentage}%</Label>
          <Slider
            value={[formData.percentage]}
            onValueChange={([value]) => setFormData({ ...formData, percentage: value })}
            max={100}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hoursPlayed">Hours Played *</Label>
          <Input
            id="hoursPlayed"
            type="number"
            min="0"
            value={formData.hoursPlayed}
            onChange={(e) => setFormData({ ...formData, hoursPlayed: parseInt(e.target.value) || 0 })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minutesPlayed">Minutes Played *</Label>
          <Input
            id="minutesPlayed"
            type="number"
            min="0"
            max="59"
            value={formData.minutesPlayed === 0 ? '' : formData.minutesPlayed}
            onChange={(e) => setFormData({ ...formData, minutesPlayed: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Date Started *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.dateStarted && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.dateStarted ? format(formData.dateStarted, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.dateStarted || undefined}
                onSelect={(date) => setFormData({ ...formData, dateStarted: date || null })}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Date Completed</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.dateCompleted && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.dateCompleted ? format(formData.dateCompleted, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.dateCompleted || undefined}
                onSelect={(date) => setFormData({ ...formData, dateCompleted: date || null })}
                disabled={(date) => formData.dateStarted ? date < formData.dateStarted : false}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="store">Store *</Label>
          <Input
            id="store"
            value={formData.store}
            onChange={(e) => setFormData({ ...formData, store: e.target.value })}
            placeholder="Steam, Epic, PlayStation..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price ($) *</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? "Update" : "Add"} Game</Button>
      </div>
    </form>
  )
}
