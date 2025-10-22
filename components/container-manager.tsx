"use client"

import * as React from "react"
import { Container } from "@/types/inventory"
import { addContainerAction, updateContainerAction } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    brand: editingContainer?.brand || "",
    model: editingContainer?.model || "",
    material: editingContainer?.material || "",
    size: editingContainer?.size || "",
    capacity: editingContainer?.capacity || "",
    purchasedDate: editingContainer?.purchasedDate ? new Date(editingContainer.purchasedDate) : null as Date | null,
    purchasedFrom: editingContainer?.purchasedFrom || "",
    cost: editingContainer?.cost?.toString() || "",
    condition: editingContainer?.condition || "Good",
    notes: editingContainer?.notes || "",
    isOwned: editingContainer?.isOwned ?? true,
  })

  React.useEffect(() => {
    if (editingContainer) {
      setFormData({
        name: editingContainer.name,
        type: editingContainer.type,
        color: editingContainer.color || "",
        brand: editingContainer.brand || "",
        model: editingContainer.model || "",
        material: editingContainer.material || "",
        size: editingContainer.size || "",
        capacity: editingContainer.capacity || "",
        purchasedDate: editingContainer.purchasedDate ? new Date(editingContainer.purchasedDate) : null,
        purchasedFrom: editingContainer.purchasedFrom || "",
        cost: editingContainer.cost?.toString() || "",
        condition: editingContainer.condition || "Good",
        notes: editingContainer.notes || "",
        isOwned: editingContainer.isOwned ?? true,
      })
    } else {
      setFormData({
        name: "",
        type: "Box",
        color: "",
        brand: "",
        model: "",
        material: "",
        size: "",
        capacity: "",
        purchasedDate: null,
        purchasedFrom: "",
        cost: "",
        condition: "Good",
        notes: "",
        isOwned: true,
      })
    }
  }, [editingContainer, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clean up the data - convert empty strings to undefined for proper NULL handling
    const containerData: any = {
      name: formData.name || undefined,
      type: formData.type || undefined,
      color: formData.color || undefined,
      areaId: editingContainer?.areaId || areaId,
      brand: formData.brand || undefined,
      model: formData.model || undefined,
      material: formData.material === "none" || !formData.material ? undefined : formData.material,
      size: formData.size || undefined,
      capacity: formData.capacity || undefined,
      purchasedDate: formData.purchasedDate ? formData.purchasedDate.toISOString().split('T')[0] : undefined,
      purchasedFrom: formData.purchasedFrom || undefined,
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      condition: formData.condition === "unknown" || !formData.condition ? undefined : formData.condition,
      notes: formData.notes || undefined,
      isOwned: formData.isOwned,
    }

    if (editingContainer) {
      await updateContainerAction(Number(editingContainer.id), containerData)
    } else {
      await addContainerAction(containerData)
    }

    onContainerAdded()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle>{editingContainer ? "Edit Container" : "Add New Container"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs defaultValue="basic" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mx-4 sm:mx-6 mt-4">
              <TabsTrigger value="basic" className="h-10 text-sm sm:text-base">Basic Info</TabsTrigger>
              <TabsTrigger value="tracking" className="h-10 text-sm sm:text-base">Tracking Details</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 overflow-y-auto flex-1 p-4 sm:p-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Container Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Box 1, Backpack, Drawer 2"
                  required
                  className="h-11 text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Box">Box</SelectItem>
                      <SelectItem value="Bag">Bag</SelectItem>
                      <SelectItem value="Drawer">Drawer</SelectItem>
                      <SelectItem value="Shelf">Shelf</SelectItem>
                      <SelectItem value="Bin">Bin</SelectItem>
                      <SelectItem value="Cabinet">Cabinet</SelectItem>
                      <SelectItem value="Suitcase">Suitcase</SelectItem>
                      <SelectItem value="Container">Container</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <Select value={formData.material || "none"} onValueChange={(value) => setFormData({ ...formData, material: value === "none" ? "" : value })}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="Plastic">Plastic</SelectItem>
                      <SelectItem value="Metal">Metal</SelectItem>
                      <SelectItem value="Wood">Wood</SelectItem>
                      <SelectItem value="Fabric">Fabric</SelectItem>
                      <SelectItem value="Cardboard">Cardboard</SelectItem>
                      <SelectItem value="Glass">Glass</SelectItem>
                      <SelectItem value="Mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="e.g., Red, Blue, Clear"
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="e.g., Large, 50L, 24x18x12"
                    className="h-11 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity/Volume</Label>
                <Input
                  id="capacity"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="e.g., 50 liters, 20 items, 3 shelves"
                  className="h-11 text-base"
                />
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4 overflow-y-auto flex-1 p-4 sm:p-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., IKEA, Rubbermaid"
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., SAMLA, Roughneck"
                    className="h-11 text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasedFrom">Purchased From</Label>
                  <Input
                    id="purchasedFrom"
                    value={formData.purchasedFrom}
                    onChange={(e) => setFormData({ ...formData, purchasedFrom: e.target.value })}
                    placeholder="e.g., IKEA, Amazon, Target"
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchasedDate">Purchase Date</Label>
                  <DatePicker
                    date={formData.purchasedDate}
                    onDateChange={(date) => setFormData({ ...formData, purchasedDate: date })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select value={formData.condition || "unknown"} onValueChange={(value) => setFormData({ ...formData, condition: value === "unknown" ? "" : value })}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Poor">Poor</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isOwned"
                  checked={formData.isOwned}
                  onCheckedChange={(checked) => setFormData({ ...formData, isOwned: checked as boolean })}
                />
                <Label htmlFor="isOwned" className="cursor-pointer">
                  I own this container (not borrowed/rented)
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this container..."
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:p-6 pt-4 border-t bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11">
              Cancel
            </Button>
            <Button type="submit" className="h-11">{editingContainer ? "Update" : "Add"} Container</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}