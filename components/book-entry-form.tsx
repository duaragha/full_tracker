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
    publisher: initialData?.publisher || selectedBook?.publisher?.[0] || "",
    releaseDate: initialData?.releaseDate || selectedBook?.first_publish_year?.toString() || "",
    genre: initialData?.genre || selectedBook?.subject?.[0] || "",
    coverImage: initialData?.coverImage || (selectedBook?.cover_i ? getBookCoverUrl(selectedBook.cover_i, 'M') : ""),
    type: initialData?.type || "Ebook" as const,
    pages: initialData?.pages || null,
    hours: initialData?.minutes ? Math.floor(initialData.minutes / 60) : 0,
    minutes: initialData?.minutes ? initialData.minutes % 60 : 0,
    dateStarted: initialData?.dateStarted ? new Date(initialData.dateStarted) : null,
    dateCompleted: initialData?.dateCompleted ? new Date(initialData.dateCompleted) : null,
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

    const daysRead = calculateDays()

    onSubmit({
      title: formData.title,
      author: formData.author,
      publisher: formData.publisher,
      releaseDate: formData.releaseDate,
      genre: formData.genre,
      coverImage: formData.coverImage,
      type: formData.type,
      pages: formData.type === 'Ebook' ? formData.pages : null,
      minutes: formData.type === 'Audiobook' ? (formData.hours * 60 + formData.minutes) : null,
      daysRead,
      dateStarted: formData.dateStarted?.toISOString() || null,
      dateCompleted: formData.dateCompleted?.toISOString() || null,
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
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                value={formData.hours === 0 ? '' : formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
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
                onChange={(e) => setFormData({ ...formData, minutes: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? "Update" : "Add"} Book</Button>
      </div>
    </form>
  )
}
