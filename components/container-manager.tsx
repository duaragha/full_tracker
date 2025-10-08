"use client"

import * as React from "react"
import { Container } from "@/types/inventory"
import { addContainerAction, updateContainerAction } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ContainerManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContainerAdded: () => void
  areaId: string
  editingContainer?: Container
}

export function ContainerManager({ open, onOpenChange, onContainerAdded, areaId, editingContainer }: ContainerManagerProps) {
  const [formData, setFormData] = React.useState({
    name: editingContainer?.name || "",
    type: editingContainer?.type || "Box",
    color: editingContainer?.color || "",
  })

  React.useEffect(() => {
    if (editingContainer) {
      setFormData({
        name: editingContainer.name,
        type: editingContainer.type,
        color: editingContainer.color || "",
      })
    } else {
      setFormData({ name: "", type: "Box", color: "" })
    }
  }, [editingContainer, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingContainer) {
      await updateContainerAction(Number(editingContainer.id), formData)
    } else {
      await addContainerAction({ ...formData, areaId })
    }

    onContainerAdded()
    onOpenChange(false)
    setFormData({ name: "", type: "Box", color: "" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingContainer ? "Edit Container" : "Add New Container"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Container Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Box 1, Backpack, Drawer 2"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Box">Box</SelectItem>
                <SelectItem value="Bag">Bag</SelectItem>
                <SelectItem value="Drawer">Drawer</SelectItem>
                <SelectItem value="Shelf">Shelf</SelectItem>
                <SelectItem value="Bin">Bin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color (optional)</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="e.g., Red, Blue"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingContainer ? "Update" : "Add"} Container</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
