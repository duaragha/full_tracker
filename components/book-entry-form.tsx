"use client"

import * as React from "react"
import { Book, BookSearchResult } from "@/types/book"
import { getBookCoverUrl } from "@/lib/api/books"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BookEntryFormProps {
  selectedBook: BookSearchResult | null
  onSubmit: (book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  initialData?: Book
}

export function BookEntryForm({ selectedBook, onSubmit, onCancel, initialData }: BookEntryFormProps) {
  const [formData, setFormData] = React.useState({
    title: initialData?.title || selectedBook?.title || "",
    author: initialData?.author || selectedBook?.author_name?.[0] || "",
    status: initialData?.status || "Want to Read",
    releaseDate: initialData?.releaseDate || selectedBook?.first_publish_year?.toString() || "",
    genre: initialData?.genre || selectedBook?.subject?.[0] || "",
    coverImage: initialData?.coverImage || (selectedBook?.cover_url || (selectedBook?.cover_i ? getBookCoverUrl(selectedBook.cover_i, 'M') : "")),
    type: initialData?.type || "Ebook" as const,
    pages: initialData?.pages || null,
    hours: initialData?.minutes ? Math.floor(initialData.minutes / 60) : 0,
    minutes: initialData?.minutes ? initialData.minutes % 60 : 0,
    totalMinutes: initialData?.minutes || 0,
    dateStarted: initialData?.dateStarted ? new Date(initialData.dateStarted) : null,
    dateCompleted: initialData?.dateCompleted ? new Date(initialData.dateCompleted) : null,
    notes: initialData?.notes || "",
  })

  // Sync hours/minutes with totalMinutes
  const handleHoursChange = (value: number) => {
    const newHours = value || 0
    const totalMins = newHours * 60 + formData.minutes
    setFormData({ ...formData, hours: newHours, totalMinutes: totalMins })
  }

  const handleMinutesChange = (value: number) => {
    const newMins = value || 0
    const totalMins = formData.hours * 60 + newMins
    setFormData({ ...formData, minutes: newMins, totalMinutes: totalMins })
  }

  const handleTotalMinutesChange = (value: number) => {
    const totalMins = value || 0
    const hours = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    setFormData({ ...formData, totalMinutes: totalMins, hours, minutes: mins })
  }

  const calculateDays = () => {
    if (!formData.dateStarted) return 0
    const end = formData.dateCompleted || new Date()
    const start = formData.dateStarted
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const daysRead = calculateDays()

    onSubmit({
      title: formData.title,
      author: formData.author,
      status: formData.status,
      releaseDate: formData.releaseDate,
      genre: formData.genre,
      coverImage: formData.coverImage,
      type: formData.type,
      pages: formData.type === 'Ebook' ? formData.pages : null,
      minutes: formData.type === 'Audiobook' ? formData.totalMinutes : null,
      daysRead,
      dateStarted: formData.dateStarted?.toISOString() || null,
      dateCompleted: formData.dateCompleted?.toISOString() || null,
      notes: formData.notes,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Want to Read">Want to Read</SelectItem>
              <SelectItem value="Reading">Reading</SelectItem>
              <SelectItem value="Listening">Listening</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="DNF">Did Not Finish</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="genre">Genre</Label>
          <Input
            id="genre"
            value={formData.genre}
            onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Type</Label>
          <RadioGroup
            value={formData.type}
            onValueChange={(value: any) => setFormData({ ...formData, type: value })}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Ebook" id="ebook" />
              <Label htmlFor="ebook" className="font-normal cursor-pointer">Ebook</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Audiobook" id="audiobook" />
              <Label htmlFor="audiobook" className="font-normal cursor-pointer">Audiobook</Label>
            </div>
          </RadioGroup>
        </div>

        {formData.type === 'Ebook' && (
          <div className="space-y-2">
            <Label htmlFor="pages">Pages</Label>
            <Input
              id="pages"
              type="number"
              value={formData.pages || ""}
              onChange={(e) => setFormData({ ...formData, pages: parseInt(e.target.value) || null })}
            />
          </div>
        )}

        {formData.type === 'Audiobook' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="totalMinutes">Total Minutes</Label>
              <Input
                id="totalMinutes"
                type="number"
                min="0"
                value={formData.totalMinutes === 0 ? '' : formData.totalMinutes}
                onChange={(e) => handleTotalMinutesChange(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                placeholder="Enter total minutes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                value={formData.hours === 0 ? '' : formData.hours}
                onChange={(e) => handleHoursChange(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes">Minutes</Label>
              <Input
                id="minutes"
                type="number"
                min="0"
                max="59"
                value={formData.minutes === 0 ? '' : formData.minutes}
                onChange={(e) => handleMinutesChange(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </>
        )}

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

      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" className="w-full sm:w-auto">{initialData ? "Update" : "Add"} Book</Button>
      </div>
    </form>
  )
}
