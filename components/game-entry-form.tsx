"use client"

import * as React from "react"
import { Game, GameSearchResult } from "@/types/game"
import { getGameDetails } from "@/lib/api/games"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { DatePicker } from "@/components/ui/date-picker"

interface GameEntryFormProps {
  selectedGame: GameSearchResult | null
  onSubmit: (game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  initialData?: Game
}

export function GameEntryForm({ selectedGame, onSubmit, onCancel, initialData }: GameEntryFormProps) {
  const [formData, setFormData] = React.useState({
    title: initialData?.title || selectedGame?.name || "",
    publisher: initialData?.publisher || (selectedGame as any)?.publishers?.[0]?.name || "",
    developer: initialData?.developer || (selectedGame as any)?.developers?.[0]?.name || "",
    genres: initialData?.genres || (selectedGame as any)?.genres?.map((g: any) => g.name) || [],
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
    const pricePerHour = formData.price > 0 ? totalHours / formData.price : 0

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
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="publisher">Publisher</Label>
          <Input
            id="publisher"
            value={formData.publisher}
            onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="developer">Developer</Label>
          <Input
            id="developer"
            value={formData.developer}
            onChange={(e) => setFormData({ ...formData, developer: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="genres">Genres</Label>
          <Input
            id="genres"
            value={formData.genres.join(', ')}
            onChange={(e) => setFormData({ ...formData, genres: e.target.value.split(',').map(g => g.trim()).filter(g => g) })}
            placeholder="Action, RPG, Adventure"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: any) => setFormData({ ...formData, status: value })}
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
          <Label htmlFor="console">Console/Platform</Label>
          <Input
            id="console"
            value={formData.console}
            onChange={(e) => setFormData({ ...formData, console: e.target.value })}
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
          <Label htmlFor="hoursPlayed">Hours Played</Label>
          <Input
            id="hoursPlayed"
            type="number"
            min="0"
            value={formData.hoursPlayed === 0 ? '' : formData.hoursPlayed}
            onChange={(e) => setFormData({ ...formData, hoursPlayed: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minutesPlayed">Minutes Played</Label>
          <Input
            id="minutesPlayed"
            type="number"
            min="0"
            max="59"
            value={formData.minutesPlayed === 0 ? '' : formData.minutesPlayed}
            onChange={(e) => setFormData({ ...formData, minutesPlayed: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label>Date Started</Label>
          <DatePicker
            date={formData.dateStarted}
            onDateChange={(date) => setFormData({ ...formData, dateStarted: date })}
            placeholder="Pick start date"
          />
        </div>

        <div className="space-y-2">
          <Label>Date Completed</Label>
          <DatePicker
            date={formData.dateCompleted}
            onDateChange={(date) => setFormData({ ...formData, dateCompleted: date })}
            placeholder="Pick completion date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="store">Store</Label>
          <Input
            id="store"
            value={formData.store}
            onChange={(e) => setFormData({ ...formData, store: e.target.value })}
            placeholder="Steam, Epic, PlayStation..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price === 0 ? '' : formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
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
