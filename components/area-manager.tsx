"use client"

import * as React from "react"
import { Area } from "@/types/inventory"
import { addAreaAction, updateAreaAction } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AreaManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAreaAdded: () => void
  editingArea?: Area
}

export function AreaManager({ open, onOpenChange, onAreaAdded, editingArea }: AreaManagerProps) {
  const [formData, setFormData] = React.useState({
    name: editingArea?.name || "",
    type: editingArea?.type || "Room",
  })

  React.useEffect(() => {
    if (editingArea) {
      setFormData({
        name: editingArea.name,
        type: editingArea.type,
      })
    } else {
      setFormData({ name: "", type: "Room" })
    }
  }, [editingArea, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingArea) {
      await updateAreaAction(Number(editingArea.id), formData)
    } else {
      await addAreaAction(formData)
    }

    onAreaAdded()
    onOpenChange(false)
    setFormData({ name: "", type: "Room" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle>{editingArea ? "Edit Area" : "Add New Area"}</DialogTitle>
        </DialogHeader>
        <form id="area-form" onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 p-4 sm:p-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Area Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Bedroom, Closet, Garage"
              required
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily Stuff">Daily Stuff</SelectItem>
                <SelectItem value="Room">Room</SelectItem>
                <SelectItem value="Closet">Closet</SelectItem>
                <SelectItem value="Storage">Storage</SelectItem>
                <SelectItem value="Garage">Garage</SelectItem>
                <SelectItem value="Attic">Attic</SelectItem>
                <SelectItem value="Basement">Basement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:p-6 pt-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11">
            Cancel
          </Button>
          <Button type="submit" form="area-form" className="h-11">{editingArea ? "Update" : "Add"} Area</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
