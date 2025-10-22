"use client"

import * as React from "react"
import { Section } from "@/types/inventory"
import { addSectionAction, updateSectionAction } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SectionManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSectionAdded: () => void
  containerId: string
  editingSection?: Section
}

export function SectionManager({ open, onOpenChange, onSectionAdded, containerId, editingSection }: SectionManagerProps) {
  const [formData, setFormData] = React.useState({
    name: editingSection?.name || "",
    type: editingSection?.type || "Drawer",
    position: editingSection?.position || "",
    notes: editingSection?.notes || "",
  })

  React.useEffect(() => {
    if (editingSection) {
      setFormData({
        name: editingSection.name,
        type: editingSection.type || "Drawer",
        position: editingSection.position || "",
        notes: editingSection.notes || "",
      })
    } else {
      setFormData({
        name: "",
        type: "Drawer",
        position: "",
        notes: "",
      })
    }
  }, [editingSection, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const sectionData: any = {
      name: formData.name || undefined,
      containerId: editingSection?.containerId || containerId,
      type: formData.type || undefined,
      position: formData.position || undefined,
      notes: formData.notes || undefined,
    }

    if (editingSection) {
      await updateSectionAction(Number(editingSection.id), sectionData)
    } else {
      await addSectionAction(sectionData)
    }

    onSectionAdded()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle>{editingSection ? "Edit Section" : "Add New Section"}</DialogTitle>
        </DialogHeader>
        <form id="section-form" onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 p-4 sm:p-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Section Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Top Drawer, Left Pocket, Front Compartment"
              required
              className="h-11 text-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Drawer">Drawer</SelectItem>
                  <SelectItem value="Shelf">Shelf</SelectItem>
                  <SelectItem value="Compartment">Compartment</SelectItem>
                  <SelectItem value="Pocket">Pocket</SelectItem>
                  <SelectItem value="Tray">Tray</SelectItem>
                  <SelectItem value="Divider">Divider</SelectItem>
                  <SelectItem value="Slot">Slot</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select value={formData.position || "none"} onValueChange={(value) => setFormData({ ...formData, position: value === "none" ? "" : value })}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Top">Top</SelectItem>
                  <SelectItem value="Middle">Middle</SelectItem>
                  <SelectItem value="Bottom">Bottom</SelectItem>
                  <SelectItem value="Left">Left</SelectItem>
                  <SelectItem value="Right">Right</SelectItem>
                  <SelectItem value="Front">Front</SelectItem>
                  <SelectItem value="Back">Back</SelectItem>
                  <SelectItem value="Center">Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this section..."
              rows={3}
              className="text-base"
            />
          </div>
        </form>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:p-6 pt-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11">
            Cancel
          </Button>
          <Button type="submit" form="section-form" className="h-11">{editingSection ? "Update" : "Add"} Section</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
