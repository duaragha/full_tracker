"use client"

import * as React from "react"
import { Book } from "@/types/book"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllSeriesAction, linkBookToSeriesAction, unlinkBookFromSeriesAction } from "@/app/actions/books"
import { BookSeries } from "@/types/book"

interface BookSeriesAssignmentProps {
  book: Book | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BookSeriesAssignment({ book, open, onOpenChange, onSuccess }: BookSeriesAssignmentProps) {
  const [allSeries, setAllSeries] = React.useState<{ id: number; name: string }[]>([])
  const [selectedSeries, setSelectedSeries] = React.useState<string>("")
  const [newSeriesName, setNewSeriesName] = React.useState("")
  const [position, setPosition] = React.useState("")
  const [isCreatingNew, setIsCreatingNew] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    const loadSeries = async () => {
      const series = await getAllSeriesAction()
      setAllSeries(series.map((s: BookSeries) => ({ id: s.id, name: s.name })))
    }
    loadSeries()
  }, [])

  React.useEffect(() => {
    if (book && open) {
      // Reset form when opening with a new book
      setSelectedSeries(book.seriesName || "")
      setPosition(book.positionInSeries?.toString() || "")
      setNewSeriesName("")
      setIsCreatingNew(false)
    }
  }, [book, open])

  const handleSubmit = async () => {
    if (!book) return

    setIsSubmitting(true)
    try {
      const seriesName = isCreatingNew ? newSeriesName : selectedSeries
      if (!seriesName) {
        alert("Please enter a series name")
        return
      }

      const positionNum = position ? parseFloat(position) : undefined

      await linkBookToSeriesAction(parseInt(book.id), seriesName, positionNum)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error linking book to series:", error)
      alert("Failed to link book to series")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async () => {
    if (!book || !book.seriesName) return

    if (!confirm(`Remove "${book.title}" from "${book.seriesName}" series?`)) {
      return
    }

    setIsSubmitting(true)
    try {
      await unlinkBookFromSeriesAction(parseInt(book.id))
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error removing book from series:", error)
      alert("Failed to remove book from series")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!book) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Series Assignment</DialogTitle>
          <DialogDescription>
            Assign "{book.title}" to a series or create a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Series</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!isCreatingNew ? "default" : "outline"}
                onClick={() => setIsCreatingNew(false)}
                className="flex-1"
              >
                Existing Series
              </Button>
              <Button
                type="button"
                variant={isCreatingNew ? "default" : "outline"}
                onClick={() => setIsCreatingNew(true)}
                className="flex-1"
              >
                Create New
              </Button>
            </div>
          </div>

          {isCreatingNew ? (
            <div className="space-y-2">
              <Label htmlFor="new-series">New Series Name</Label>
              <Input
                id="new-series"
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="Enter series name..."
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="series-select">Select Series</Label>
              <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                <SelectTrigger id="series-select">
                  <SelectValue placeholder="Choose a series..." />
                </SelectTrigger>
                <SelectContent>
                  {allSeries.map((series) => (
                    <SelectItem key={series.id} value={series.name}>
                      {series.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="position">Position in Series (optional)</Label>
            <Input
              id="position"
              type="number"
              step="0.1"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., 1, 2.5, 3..."
            />
            <p className="text-sm text-muted-foreground">
              Use decimals for prequels (e.g., 0.5) or interquels (e.g., 2.5)
            </p>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          {book.seriesName && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={isSubmitting}
            >
              Remove from Series
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
