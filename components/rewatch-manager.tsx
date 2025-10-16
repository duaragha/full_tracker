"use client"

import * as React from "react"
import { RewatchEntry } from "@/types/tvshow"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash2, Plus, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RewatchManagerProps {
  rewatchHistory: RewatchEntry[]
  onUpdate: (history: RewatchEntry[]) => void
}

export function RewatchManager({ rewatchHistory, onUpdate }: RewatchManagerProps) {
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [newRewatch, setNewRewatch] = React.useState<{
    startDate: Date | null
    endDate: Date | null
    notes: string
  }>({
    startDate: new Date(),
    endDate: null,
    notes: ""
  })

  const handleAddRewatch = () => {
    if (!newRewatch.startDate) return

    const entry: RewatchEntry = {
      startDate: newRewatch.startDate.toISOString().split('T')[0],
      endDate: newRewatch.endDate ? newRewatch.endDate.toISOString().split('T')[0] : null,
      notes: newRewatch.notes || undefined
    }

    onUpdate([...rewatchHistory, entry])

    // Reset form
    setNewRewatch({
      startDate: new Date(),
      endDate: null,
      notes: ""
    })
    setShowAddDialog(false)
  }

  const handleDeleteRewatch = (index: number) => {
    const updated = rewatchHistory.filter((_, i) => i !== index)
    onUpdate(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Rewatch History
          </h3>
          <p className="text-sm text-muted-foreground">
            Track multiple watch-throughs of this show
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Rewatch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Rewatch Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  date={newRewatch.startDate}
                  onDateChange={(date) => setNewRewatch({ ...newRewatch, startDate: date })}
                  placeholder="When did you start?"
                />
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <DatePicker
                  date={newRewatch.endDate}
                  onDateChange={(date) => setNewRewatch({ ...newRewatch, endDate: date })}
                  placeholder="When did you finish?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rewatch-notes">Notes (Optional)</Label>
                <Textarea
                  id="rewatch-notes"
                  value={newRewatch.notes}
                  onChange={(e) => setNewRewatch({ ...newRewatch, notes: e.target.value })}
                  rows={3}
                  placeholder="Any thoughts about this rewatch..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRewatch} disabled={!newRewatch.startDate}>
                  Add Rewatch
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rewatchHistory.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground text-sm">
              No rewatches recorded yet. Add one to start tracking!
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rewatchHistory.map((rewatch, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Rewatch #{index + 1}</Badge>
                      <span className="text-sm font-medium">
                        {new Date(rewatch.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                        {rewatch.endDate && (
                          <>
                            {" - "}
                            {new Date(rewatch.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </>
                        )}
                      </span>
                    </div>
                    {rewatch.notes && (
                      <p className="text-sm text-muted-foreground">{rewatch.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRewatch(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
