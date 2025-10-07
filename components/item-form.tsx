"use client"

import * as React from "react"
import { InventoryItem, Area, Container } from "@/types/inventory"
import { addItem, updateItem } from "@/lib/store/inventory-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

interface ItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemAdded: () => void
  areas: Area[]
  containers: Container[]
  selectedArea?: string
  selectedContainer?: string
  editingItem?: InventoryItem
}

export function ItemForm({ open, onOpenChange, onItemAdded, areas, containers, selectedArea, selectedContainer, editingItem }: ItemFormProps) {
  const [formData, setFormData] = React.useState({
    name: "",
    usedInLastYear: false,
    areaId: selectedArea || "",
    containerId: selectedContainer || "",
    type: "",
    cost: "",
    isGift: false,
    giftFrom: "",
    purchasedWhere: "",
    purchasedWhen: null as Date | null,
    keepUntil: null as Date | null,
    kept: true,
    soldDate: null as Date | null,
    soldPrice: "",
    notes: "",
  })

  React.useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name,
        usedInLastYear: editingItem.usedInLastYear,
        areaId: editingItem.location.areaId,
        containerId: editingItem.location.containerId,
        type: editingItem.type,
        cost: editingItem.cost.toString(),
        isGift: editingItem.isGift,
        giftFrom: editingItem.giftFrom || "",
        purchasedWhere: editingItem.purchasedWhere,
        purchasedWhen: editingItem.purchasedWhen ? new Date(editingItem.purchasedWhen) : null,
        keepUntil: editingItem.keepUntil ? new Date(editingItem.keepUntil) : null,
        kept: editingItem.kept,
        soldDate: editingItem.soldDate ? new Date(editingItem.soldDate) : null,
        soldPrice: editingItem.soldPrice?.toString() || "",
        notes: editingItem.notes,
      })
    } else {
      setFormData({
        name: "",
        usedInLastYear: false,
        areaId: selectedArea || "",
        containerId: selectedContainer || "",
        type: "",
        cost: "",
        isGift: false,
        giftFrom: "",
        purchasedWhere: "",
        purchasedWhen: null,
        keepUntil: null,
        kept: true,
        soldDate: null,
        soldPrice: "",
        notes: "",
      })
    }
  }, [editingItem, open, selectedArea, selectedContainer])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const itemData = {
      name: formData.name,
      usedInLastYear: formData.usedInLastYear,
      location: {
        areaId: formData.areaId,
        containerId: formData.containerId,
      },
      type: formData.type,
      cost: parseFloat(formData.cost) || 0,
      isGift: formData.isGift,
      giftFrom: formData.isGift ? formData.giftFrom : null,
      purchasedWhere: formData.purchasedWhere,
      purchasedWhen: formData.purchasedWhen?.toISOString() || "",
      keepUntil: formData.keepUntil?.toISOString() || null,
      kept: formData.kept,
      soldDate: formData.soldDate?.toISOString() || null,
      soldPrice: formData.soldPrice ? parseFloat(formData.soldPrice) : null,
      notes: formData.notes,
    }

    if (editingItem) {
      updateItem(editingItem.id, itemData)
    } else {
      addItem(itemData)
    }

    onItemAdded()
    onOpenChange(false)
  }

  const availableContainers = containers.filter(c => c.areaId === formData.areaId)

  const itemTypes = [
    "Electronics", "Clothing", "Documents", "Books", "Tools", "Kitchen",
    "Sports", "Toys", "Office Supplies", "Collectibles", "Furniture",
    "Decorations", "Miscellaneous"
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {itemTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="areaId">Area *</Label>
              <Select
                value={formData.areaId}
                onValueChange={(value) => setFormData({ ...formData, areaId: value, containerId: "" })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map(area => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="containerId">Container</Label>
              <Select value={formData.containerId} onValueChange={(value) => setFormData({ ...formData, containerId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select container (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableContainers.map(container => (
                    <SelectItem key={container.id} value={container.id}>{container.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!formData.isGift && (
              <div className="space-y-2">
                <Label htmlFor="cost">Cost *</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  required={!formData.isGift}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="purchasedWhere">Where Purchased *</Label>
              <Input
                id="purchasedWhere"
                value={formData.purchasedWhere}
                onChange={(e) => setFormData({ ...formData, purchasedWhere: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>When Purchased *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.purchasedWhen && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.purchasedWhen ? format(formData.purchasedWhen, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.purchasedWhen || undefined}
                    onSelect={(date) => setFormData({ ...formData, purchasedWhen: date || null })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Keep Until (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.keepUntil && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.keepUntil ? format(formData.keepUntil, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.keepUntil || undefined}
                    onSelect={(date) => setFormData({ ...formData, keepUntil: date || null })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="usedInLastYear"
                checked={formData.usedInLastYear}
                onCheckedChange={(checked) => setFormData({ ...formData, usedInLastYear: checked as boolean })}
              />
              <Label htmlFor="usedInLastYear" className="cursor-pointer">Was it used in the last year?</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isGift"
                checked={formData.isGift}
                onCheckedChange={(checked) => setFormData({ ...formData, isGift: checked as boolean })}
              />
              <Label htmlFor="isGift" className="cursor-pointer">This is a gift</Label>
            </div>

            {formData.isGift && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="giftFrom">Gift From</Label>
                <Input
                  id="giftFrom"
                  value={formData.giftFrom}
                  onChange={(e) => setFormData({ ...formData, giftFrom: e.target.value })}
                  placeholder="Who gave this gift?"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="kept"
                checked={formData.kept}
                onCheckedChange={(checked) => setFormData({ ...formData, kept: checked as boolean })}
              />
              <Label htmlFor="kept" className="cursor-pointer">Still kept/owned</Label>
            </div>

            {!formData.kept && (
              <div className="grid gap-4 md:grid-cols-2 ml-6">
                <div className="space-y-2">
                  <Label>Date Sold/Disposed</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.soldDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.soldDate ? format(formData.soldDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.soldDate || undefined}
                        onSelect={(date) => setFormData({ ...formData, soldDate: date || null })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soldPrice">Price Sold For</Label>
                  <Input
                    id="soldPrice"
                    type="number"
                    step="0.01"
                    value={formData.soldPrice}
                    onChange={(e) => setFormData({ ...formData, soldPrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingItem ? "Update" : "Add"} Item</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
