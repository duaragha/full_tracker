"use client"

import * as React from "react"
import { InventoryItem, Area, Container, Section } from "@/types/inventory"
import { addInventoryItemAction, updateInventoryItemAction, getSectionsByContainerAction } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"

interface ItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemAdded: () => void
  areas: Area[]
  containers: Container[]
  items: InventoryItem[]
  selectedArea?: string
  selectedContainer?: string
  editingItem?: InventoryItem
}

export function ItemForm({ open, onOpenChange, onItemAdded, areas, containers, items, selectedArea, selectedContainer, editingItem }: ItemFormProps) {
  const [sections, setSections] = React.useState<Section[]>([])
  const [formData, setFormData] = React.useState({
    name: "",
    usedInLastYear: false,
    areaId: selectedArea || "",
    containerId: selectedContainer || "",
    sectionId: "",
    parentItemId: "",
    isReplacement: false,
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

  // Load sections when container changes
  React.useEffect(() => {
    const loadSections = async () => {
      if (formData.containerId) {
        const fetchedSections = await getSectionsByContainerAction(Number(formData.containerId))
        setSections(fetchedSections)
      } else {
        setSections([])
      }
    }
    loadSections()
  }, [formData.containerId])

  React.useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name,
        usedInLastYear: editingItem.usedInLastYear,
        areaId: editingItem.location.areaId,
        containerId: editingItem.location.containerId,
        sectionId: editingItem.location.sectionId || "",
        parentItemId: editingItem.parentItemId || "",
        isReplacement: editingItem.isReplacement || false,
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
        sectionId: "",
        parentItemId: "",
        isReplacement: false,
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

  // Auto-calculate keepUntil based on cost and purchasedWhen
  React.useEffect(() => {
    if (formData.cost && formData.purchasedWhen && !editingItem) {
      const price = parseFloat(formData.cost)
      const purchaseDate = new Date(formData.purchasedWhen)

      // Calculate multiplier based on price ranges
      let multiplier = 4 // Default for $0-250
      if (price >= 251 && price <= 500) {
        multiplier = 3
      } else if (price >= 501 && price <= 1000) {
        multiplier = 2
      } else if (price >= 1001 && price <= 1500) {
        multiplier = 1.5
      } else if (price >= 1501 && price <= 2000) {
        multiplier = 1
      } else if (price >= 2001) {
        multiplier = 0.75
      }

      // Calculate days to add
      const daysToAdd = Math.round(price * multiplier)

      // Add days to purchase date
      const keepUntilDate = new Date(purchaseDate)
      keepUntilDate.setDate(keepUntilDate.getDate() + daysToAdd)

      setFormData(prev => ({ ...prev, keepUntil: keepUntilDate }))
    }
  }, [formData.cost, formData.purchasedWhen, editingItem])

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date | null): string | null => {
    if (!date) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const itemData = {
      name: formData.name,
      usedInLastYear: formData.usedInLastYear,
      location: {
        areaId: formData.areaId,
        containerId: formData.containerId,
        sectionId: formData.sectionId || undefined,
      },
      parentItemId: formData.parentItemId && formData.parentItemId !== "" ? formData.parentItemId : null,
      isReplacement: formData.isReplacement,
      type: formData.type,
      cost: parseFloat(formData.cost) || 0,
      isGift: formData.isGift,
      giftFrom: formData.giftFrom || null,
      purchasedWhere: formData.purchasedWhere,
      purchasedWhen: formatDateLocal(formData.purchasedWhen) || "",
      keepUntil: formatDateLocal(formData.keepUntil),
      kept: formData.kept,
      soldDate: formatDateLocal(formData.soldDate),
      soldPrice: formData.soldPrice ? parseFloat(formData.soldPrice) : null,
      notes: formData.notes,
    }

    if (editingItem) {
      await updateInventoryItemAction(Number(editingItem.id), itemData)
    } else {
      await addInventoryItemAction(itemData)
    }

    onItemAdded()
    onOpenChange(false)
  }

  const availableContainers = containers.filter(c => c.areaId === formData.areaId)

  // Filter available parent items - exclude current item and its descendants
  const availableParentItems = React.useMemo(() => {
    if (!editingItem) return items

    // Build a set of items that can't be parents (current item + all its descendants)
    const excludedIds = new Set<string>([editingItem.id])

    const addDescendants = (itemId: string) => {
      items.forEach(item => {
        if (item.parentItemId === itemId && !excludedIds.has(item.id)) {
          excludedIds.add(item.id)
          addDescendants(item.id)
        }
      })
    }

    addDescendants(editingItem.id)

    return items.filter(item => !excludedIds.has(item.id))
  }, [items, editingItem])

  const itemTypes = [
    "Electronics", "Clothing", "Documents", "Books", "Tools", "Kitchen",
    "Sports", "Toys", "Office Supplies", "Collectibles", "Furniture",
    "Decorations", "Miscellaneous"
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="h-11 text-base">
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
              <Label htmlFor="areaId">Area</Label>
              <Select
                value={formData.areaId}
                onValueChange={(value) => setFormData({ ...formData, areaId: value, containerId: "" })}
              >
                <SelectTrigger className="h-11 text-base">
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
              <Select value={formData.containerId} onValueChange={(value) => setFormData({ ...formData, containerId: value, sectionId: "" })}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Select container (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableContainers.map(container => (
                    <SelectItem key={container.id} value={container.id}>{container.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.containerId && sections.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="sectionId">Section (Optional)</Label>
                <Select value={formData.sectionId} onValueChange={(value) => setFormData({ ...formData, sectionId: value })}>
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue placeholder="Select section (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map(section => (
                      <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sections help organize items within containers (e.g., "Top Shelf", "Left Pocket")
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="parentItemId">Parent Item (Optional)</Label>
              <Select value={formData.parentItemId || "none"} onValueChange={(value) => setFormData({ ...formData, parentItemId: value === "none" ? "" : value })}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="None (top-level item)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level item)</SelectItem>
                  {availableParentItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                For nested items (e.g., GPU inside PC, tools in toolbox)
              </p>
            </div>

            {formData.parentItemId && formData.parentItemId !== "" && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="isReplacement"
                  checked={formData.isReplacement}
                  onCheckedChange={(checked) => setFormData({ ...formData, isReplacement: checked as boolean })}
                />
                <Label htmlFor="isReplacement" className="cursor-pointer text-sm">
                  This is a replacement item (parent is new, this child is the old item being replaced)
                </Label>
              </div>
            )}

            {!formData.isGift && (
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  required={!formData.isGift}
                  className="h-11 text-base"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="purchasedWhere">Where Purchased</Label>
              <Input
                id="purchasedWhere"
                value={formData.purchasedWhere}
                onChange={(e) => setFormData({ ...formData, purchasedWhere: e.target.value })}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label>When Purchased</Label>
              <DatePicker
                date={formData.purchasedWhen}
                onDateChange={(date) => setFormData({ ...formData, purchasedWhen: date })}
                placeholder="Pick purchase date"
              />
            </div>

            <div className="space-y-2">
              <Label>Keep Until (optional)</Label>
              <DatePicker
                date={formData.keepUntil}
                onDateChange={(date) => setFormData({ ...formData, keepUntil: date })}
                placeholder="Pick expiration date"
              />
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

            <div className="space-y-2">
              <Label htmlFor="giftFrom">From (Person/Friend/Store)</Label>
              <Input
                id="giftFrom"
                value={formData.giftFrom}
                onChange={(e) => setFormData({ ...formData, giftFrom: e.target.value })}
                placeholder="Who did you get this from? (e.g., John, Mom, Estate Sale)"
                className="h-11 text-base"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="kept"
                checked={formData.kept}
                onCheckedChange={(checked) => setFormData({ ...formData, kept: checked as boolean })}
              />
              <Label htmlFor="kept" className="cursor-pointer">Still kept/owned</Label>
            </div>

            {!formData.kept && (
              <div className="grid gap-4 sm:grid-cols-2 ml-6">
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
                    className="h-11 text-base"
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
              className="text-base"
            />
          </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:p-6 pt-4 border-t bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11">
              Cancel
            </Button>
            <Button type="submit" className="h-11">{editingItem ? "Update" : "Add"} Item</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
