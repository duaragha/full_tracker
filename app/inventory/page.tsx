"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Package as PackageIcon, AlertTriangle, Layers } from "lucide-react"
import { Area, Container, InventoryItem, Section } from "@/types/inventory"
import {
  getAreasAction,
  getContainersAction,
  getSectionsAction,
  getInventoryItemsAction,
  deleteAreaAction,
  deleteContainerAction,
  deleteSectionAction,
  deleteInventoryItemAction,
} from "@/app/actions/inventory"
import { AreaManager } from "@/components/area-manager"
import { ContainerManager } from "@/components/container-manager"
import { SectionManager } from "@/components/section-manager"
import { ItemForm } from "@/components/item-form"
import { PinAuth } from "@/components/pin-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function InventoryPage() {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // This ensures React Hooks are called in the same order on every render

  const [mounted, setMounted] = React.useState(false)
  const [isUnlocked, setIsUnlocked] = React.useState(false)
  const [areas, setAreas] = React.useState<Area[]>([])
  const [containers, setContainers] = React.useState<Container[]>([])
  const [sections, setSections] = React.useState<Section[]>([])
  const [items, setItems] = React.useState<InventoryItem[]>([])

  const [selectedArea, setSelectedArea] = React.useState<string | null>(null)
  const [selectedContainer, setSelectedContainer] = React.useState<string | null>(null)
  const [expandedAreas, setExpandedAreas] = React.useState<Set<string>>(new Set())
  const [expandedContainers, setExpandedContainers] = React.useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())

  const [showAreaDialog, setShowAreaDialog] = React.useState(false)
  const [showContainerDialog, setShowContainerDialog] = React.useState(false)
  const [showSectionDialog, setShowSectionDialog] = React.useState(false)
  const [showItemDialog, setShowItemDialog] = React.useState(false)

  const [editingArea, setEditingArea] = React.useState<Area | undefined>()
  const [editingContainer, setEditingContainer] = React.useState<Container | undefined>()
  const [editingSection, setEditingSection] = React.useState<Section | undefined>()
  const [editingItem, setEditingItem] = React.useState<InventoryItem | undefined>()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"name" | "cost" | "purchasedWhen">("name")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const loadData = React.useCallback(async () => {
    const [areasData, containersData, sectionsData, itemsData] = await Promise.all([
      getAreasAction(),
      getContainersAction(),
      getSectionsAction(),
      getInventoryItemsAction()
    ])
    setAreas(areasData)
    setContainers(containersData)
    setSections(sectionsData)
    setItems(itemsData)
  }, [])

  const handleWipeInventory = React.useCallback(async () => {
    const confirmation = window.confirm(
      `⚠️ WARNING: This will delete ALL inventory items, containers, and areas.\n\nThis includes:\n- ${items.length} items\n- ${containers.length} containers\n- ${areas.length} areas\n\nThis action CANNOT be undone!\n\nClick OK to continue, then type DELETE in the next prompt.`
    )

    if (!confirmation) return

    const deleteConfirmation = window.prompt('Type DELETE to confirm:')
    if (deleteConfirmation !== 'DELETE') {
      alert('Wipe cancelled. You must type DELETE exactly.')
      return
    }

    try {
      // Delete in order: items -> containers -> areas
      for (const item of items) {
        await deleteInventoryItemAction(Number(item.id))
      }
      for (const container of containers) {
        await deleteContainerAction(Number(container.id))
      }
      for (const area of areas) {
        await deleteAreaAction(Number(area.id))
      }
      alert('All inventory data has been cleared.')
      await loadData()
    } catch (error) {
      alert(`Failed to wipe inventory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [items, containers, areas, loadData])

  React.useEffect(() => {
    setMounted(true)
    // Check if already unlocked in this session
    const unlocked = sessionStorage.getItem("inventory_unlocked")
    if (unlocked === "true") {
      setIsUnlocked(true)
      loadData()
    }
  }, [loadData])

  const handleUnlock = React.useCallback(() => {
    sessionStorage.setItem("inventory_unlocked", "true")
    setIsUnlocked(true)
    loadData()
  }, [loadData])

  // Helper functions - memoized with useCallback to prevent recreation
  const getAreaName = React.useCallback((areaId: string) => areas.find(a => a.id === areaId)?.name || "Unknown", [areas])
  const getContainerName = React.useCallback((containerId: string) => containers.find(c => c.id === containerId)?.name || "Unknown", [containers])
  const getSectionName = React.useCallback((sectionId: string) => sections.find(s => s.id === sectionId)?.name || "Unknown", [sections])
  const getContainersByArea = React.useCallback((areaId: string) => containers.filter(c => c.areaId === areaId), [containers])
  const getSectionsByContainer = React.useCallback((containerId: string) => sections.filter(s => s.containerId === containerId), [sections])

  // Get location display for an item
  const getItemLocation = React.useCallback((item: InventoryItem): string => {
    if (item.parentItemId) {
      // For child items
      const parent = items.find(i => i.id === item.parentItemId)
      if (parent) {
        // Check if parent has a container
        if (parent.location.containerId) {
          const containerName = getContainerName(parent.location.containerId)
          return `${containerName} / ${parent.name}`
        } else {
          // No container, just show area/parent
          const areaName = getAreaName(parent.location.areaId)
          return `${areaName} / ${parent.name}`
        }
      }
    }

    // For regular items
    if (item.location.containerId) {
      return `${getAreaName(item.location.areaId)} / ${getContainerName(item.location.containerId)}`
    } else {
      // No container, just show area
      return getAreaName(item.location.areaId)
    }
  }, [items, getAreaName, getContainerName])

  // Check if item should be considered "kept"
  const isItemKept = React.useCallback((item: InventoryItem): boolean => {
    if (item.kept) return true

    // If item was sold/retired after the keepUntil date, consider it as kept
    if (item.soldDate && item.keepUntil) {
      const soldDate = new Date(item.soldDate)
      const keepUntil = new Date(item.keepUntil)
      return soldDate >= keepUntil
    }

    // If item was sold but no keepUntil date, consider it kept if it was used in last year
    if (item.soldDate && !item.keepUntil && item.usedInLastYear) {
      return true
    }

    return false
  }, [])

  // Get all children of an item
  const getAllChildItems = React.useCallback((parentId: string): InventoryItem[] => {
    return items.filter(item => item.parentItemId === parentId)
  }, [items])

  // Calculate the actual cost of an item
  const getItemCost = React.useCallback((item: InventoryItem): number => {
    const children = getAllChildItems(item.id)
    // Exclude replacement children - they don't count toward parent's cost
    const nonReplacementChildren = children.filter(child => !child.isReplacement)

    if (nonReplacementChildren.length > 0) {
      // Parent has non-replacement children: return sum of their costs (recursive)
      return nonReplacementChildren.reduce((total, child) => total + getItemCost(child), 0)
    }
    // No non-replacement children: use parent's own cost
    return item.cost || 0
  }, [getAllChildItems])

  // All computed values that depend on state
  const displayedItems = React.useMemo(() => {
    let filtered = items

    // Filter by selection
    if (selectedContainer) {
      filtered = filtered.filter(item => item.location.containerId === selectedContainer)
    } else if (selectedArea) {
      filtered = filtered.filter(item => item.location.areaId === selectedArea)
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Separate parent items from regular items
    const parentItems: InventoryItem[] = []
    const regularItems: InventoryItem[] = []

    filtered.forEach(item => {
      const hasChildren = items.some(i => i.parentItemId === item.id)
      if (hasChildren) {
        parentItems.push(item)
      } else {
        regularItems.push(item)
      }
    })

    // Sort parents alphabetically
    parentItems.sort((a, b) => a.name.localeCompare(b.name))

    // Sort regular items according to selected criteria
    regularItems.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "cost":
          comparison = a.cost - b.cost
          break
        case "purchasedWhen":
          comparison = new Date(a.purchasedWhen).getTime() - new Date(b.purchasedWhen).getTime()
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    // Return parents first, then regular items
    return [...parentItems, ...regularItems]
  }, [items, selectedArea, selectedContainer, searchQuery, sortBy, sortOrder])

  // Group items by container for "All Items" view
  const groupedItems = React.useMemo(() => {
    if (selectedContainer || selectedArea) {
      return null
    }

    const grouped: { container: Container | null; items: InventoryItem[] }[] = []

    // Sort containers by area and name
    const sortedContainers = [...containers].sort((a, b) => {
      const areaCompare = getAreaName(a.areaId).localeCompare(getAreaName(b.areaId))
      if (areaCompare !== 0) return areaCompare
      return a.name.localeCompare(b.name)
    })

    sortedContainers.forEach(container => {
      const containerItems = displayedItems.filter(
        item => item.location.containerId === container.id
      )
      if (containerItems.length > 0) {
        grouped.push({ container, items: containerItems })
      }
    })

    // Add items without a container at the end
    const noContainerItems = displayedItems.filter(
      item => !item.location.containerId || item.location.containerId === ''
    )
    if (noContainerItems.length > 0) {
      grouped.push({ container: null, items: noContainerItems })
    }

    return grouped
  }, [displayedItems, containers, selectedContainer, selectedArea, getAreaName])

  // Filter stats to only include kept items
  const keptItems = React.useMemo(() => items.filter(i => i.kept && !i.isReplacement), [items])
  const totalItems = keptItems.length
  const itemsUsedInLastYear = React.useMemo(() => keptItems.filter(i => i.usedInLastYear).length, [keptItems])
  const totalCost = React.useMemo(() => keptItems.reduce((total, item) => {
    // Only count top-level items (not children) to avoid double-counting
    if (!item.parentItemId) {
      return total + getItemCost(item)
    }
    return total
  }, 0), [keptItems, getItemCost])
  const giftsReceived = React.useMemo(() => keptItems.filter(i => i.isGift).length, [keptItems])
  const itemsToDiscard = React.useMemo(() => keptItems.filter(i => !i.usedInLastYear).length, [keptItems])

  const toggleArea = React.useCallback((areaId: string) => {
    setExpandedAreas(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(areaId)) {
        newExpanded.delete(areaId)
      } else {
        newExpanded.add(areaId)
      }
      return newExpanded
    })
  }, [])

  const toggleContainer = React.useCallback((containerId: string) => {
    setExpandedContainers(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(containerId)) {
        newExpanded.delete(containerId)
      } else {
        newExpanded.add(containerId)
      }
      return newExpanded
    })
  }, [])

  const toggleItem = React.useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId)
      } else {
        newExpanded.add(itemId)
      }
      return newExpanded
    })
  }, [])

  const getChildItems = React.useCallback((parentId: string) => {
    return displayedItems.filter(item => item.parentItemId === parentId)
  }, [displayedItems])

  const handleAddArea = React.useCallback(() => {
    setEditingArea(undefined)
    setShowAreaDialog(true)
  }, [])

  const handleEditArea = React.useCallback((area: Area) => {
    setEditingArea(area)
    setShowAreaDialog(true)
  }, [])

  const handleDeleteArea = React.useCallback(async (id: string) => {
    if (confirm("Delete this area and all its containers and items?")) {
      await deleteAreaAction(Number(id))
      await loadData()
      if (selectedArea === id) {
        setSelectedArea(null)
        setSelectedContainer(null)
      }
    }
  }, [loadData, selectedArea])

  const handleAddContainer = React.useCallback((areaId: string) => {
    setSelectedArea(areaId)
    setEditingContainer(undefined)
    setShowContainerDialog(true)
  }, [])

  const handleEditContainer = React.useCallback((container: Container) => {
    setEditingContainer(container)
    setShowContainerDialog(true)
  }, [])

  const handleDeleteContainer = React.useCallback(async (id: string) => {
    if (confirm("Delete this container and all its sections and items?")) {
      await deleteContainerAction(Number(id))
      await loadData()
      if (selectedContainer === id) {
        setSelectedContainer(null)
      }
    }
  }, [loadData, selectedContainer])

  const handleAddSection = React.useCallback((containerId: string) => {
    setSelectedContainer(containerId)
    setEditingSection(undefined)
    setShowSectionDialog(true)
  }, [])

  const handleEditSection = React.useCallback((section: Section) => {
    setEditingSection(section)
    setShowSectionDialog(true)
  }, [])

  const handleDeleteSection = React.useCallback(async (id: string) => {
    if (confirm("Delete this section and all its items?")) {
      await deleteSectionAction(Number(id))
      await loadData()
    }
  }, [loadData])

  const handleAddItem = React.useCallback(() => {
    setEditingItem(undefined)
    setShowItemDialog(true)
  }, [])

  const handleEditItem = React.useCallback((item: InventoryItem) => {
    setEditingItem(item)
    setShowItemDialog(true)
  }, [])

  const handleDeleteItem = React.useCallback(async (id: string) => {
    if (confirm("Delete this item?")) {
      await deleteInventoryItemAction(Number(id))
      await loadData()
    }
  }, [loadData])

  // Recursive component for rendering item rows with nesting
  const renderItemRow = React.useCallback((item: InventoryItem, depth: number = 0): React.ReactNode => {
    const children = getChildItems(item.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const indentStyle = depth > 0 ? { paddingLeft: `${depth * 2}rem` } : {}

    return (
      <React.Fragment key={item.id}>
        <TableRow>
          <TableCell className="font-medium" style={indentStyle}>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => toggleItem(item.id)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              <span className={hasChildren ? "" : "ml-7"}>{item.name}</span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{item.type}</Badge>
          </TableCell>
          <TableCell>{item.usedInLastYear ? "✓" : "✗"}</TableCell>
          <TableCell className="text-sm">
            {getItemLocation(item)}
          </TableCell>
          <TableCell>${getItemCost(item).toFixed(2)}</TableCell>
          <TableCell>{item.isGift ? "✓" : "✗"}</TableCell>
          <TableCell>{item.giftFrom || "-"}</TableCell>
          <TableCell className="text-sm">{item.purchasedWhere}</TableCell>
          <TableCell className="text-sm">
            {new Date(item.purchasedWhen).toLocaleDateString()}
          </TableCell>
          <TableCell className="text-sm">
            {item.keepUntil
              ? new Date(item.keepUntil).toLocaleDateString()
              : "-"}
          </TableCell>
          <TableCell>{item.isGift ? "-" : (isItemKept(item) ? "✓" : "✗")}</TableCell>
          <TableCell className="text-sm">
            {item.soldDate
              ? new Date(item.soldDate).toLocaleDateString()
              : "-"}
          </TableCell>
          <TableCell>
            {item.soldPrice !== null && item.soldPrice !== undefined
              ? `$${item.soldPrice.toFixed(2)}`
              : "-"}
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditItem(item)}
                className="h-9 w-9"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteItem(item.id)}
                className="h-9 w-9"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && children.map(child => renderItemRow(child, depth + 1))}
      </React.Fragment>
    )
  }, [getChildItems, expandedItems, toggleItem, getItemLocation, getItemCost, isItemKept, handleEditItem, handleDeleteItem])

  // NOW we can do conditional rendering - all hooks have been called
  if (!mounted) {
    return null
  }

  if (!isUnlocked) {
    return <PinAuth onUnlock={handleUnlock} title="Inventory Access" />
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Room Inventory</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Organize and track all your belongings</p>
        </div>
        <Button
          variant="destructive"
          onClick={handleWipeInventory}
          disabled={items.length === 0}
          className="w-full sm:w-auto h-11"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Clear All Inventory
        </Button>
      </div>

      <div className="grid gap-1.5 sm:gap-2 md:gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{totalItems}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Total Items</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{itemsUsedInLastYear}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Used in Last Year</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">${totalCost.toFixed(2)}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Total Cost</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{giftsReceived}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Gifts Received</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{itemsToDiscard}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">To Discard</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        {/* Left Sidebar - Tree View */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Areas & Containers</CardTitle>
              <Button size="sm" onClick={handleAddArea} className="h-9 w-9 sm:h-10 sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">Add</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-1">
              {areas.map((area) => {
                const areaContainers = getContainersByArea(area.id)
                const isExpanded = expandedAreas.has(area.id)
                const isSelected = selectedArea === area.id && !selectedContainer

                return (
                  <div key={area.id}>
                    <div
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted touch-manipulation ${
                        isSelected ? "bg-muted" : ""
                      }`}
                    >
                      <button
                        onClick={() => toggleArea(area.id)}
                        className="p-1 hover:bg-transparent min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                      <div
                        className="flex-1 min-h-[44px] flex items-center"
                        onClick={() => {
                          setSelectedArea(area.id)
                          setSelectedContainer(null)
                        }}
                      >
                        <div>
                          <span className="font-medium text-sm sm:text-base">{area.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {area.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 sm:h-8 sm:w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddContainer(area.id)
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 sm:h-8 sm:w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditArea(area)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 sm:h-8 sm:w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteArea(area.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="ml-6 sm:ml-8 mt-1 space-y-1">
                        {areaContainers.map((container) => {
                          const isContainerSelected = selectedContainer === container.id
                          const containerSections = getSectionsByContainer(container.id)
                          const isContainerExpanded = expandedContainers.has(container.id)

                          return (
                            <div key={container.id}>
                              <div
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted touch-manipulation min-h-[44px] ${
                                  isContainerSelected ? "bg-muted" : ""
                                }`}
                              >
                                {containerSections.length > 0 && (
                                  <button
                                    onClick={() => toggleContainer(container.id)}
                                    className="p-1 hover:bg-transparent min-h-[44px] min-w-[44px] flex items-center justify-center"
                                  >
                                    {isContainerExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                                <div
                                  className="flex items-center gap-2 flex-1 min-h-[44px]"
                                  onClick={() => {
                                    setSelectedArea(area.id)
                                    setSelectedContainer(container.id)
                                  }}
                                >
                                  <PackageIcon className={`h-5 w-5 ${containerSections.length === 0 ? "ml-7" : ""}`} />
                                  <span className="flex-1 text-sm sm:text-base">{container.name}</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 sm:h-8 sm:w-8"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAddSection(container.id)
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 sm:h-8 sm:w-8"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditContainer(container)
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 sm:h-8 sm:w-8"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteContainer(container.id)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {isContainerExpanded && containerSections.length > 0 && (
                                <div className="ml-6 sm:ml-8 mt-1 space-y-1">
                                  {containerSections.map((section) => (
                                    <div
                                      key={section.id}
                                      className="flex items-center gap-2 p-2 rounded hover:bg-muted touch-manipulation min-h-[44px]"
                                    >
                                      <Layers className="h-4 w-4 ml-7" />
                                      <span className="flex-1 text-sm">{section.name}</span>
                                      <div className="flex gap-1">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-9 w-9 sm:h-8 sm:w-8"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleEditSection(section)
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-9 w-9 sm:h-8 sm:w-8"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteSection(section.id)
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {areas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No areas yet. Click + to add one.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Items Table */}
        <Card className="lg:col-span-4">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">
                  {selectedContainer
                    ? `Items in ${getContainerName(selectedContainer)}`
                    : selectedArea
                    ? `Items in ${getAreaName(selectedArea)}`
                    : "All Items"}
                </CardTitle>
                <Button onClick={handleAddItem} disabled={!selectedArea} className="w-full sm:w-auto h-11">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:max-w-sm h-11 text-base"
                />
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-[180px] h-11 text-base">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="cost">Cost</SelectItem>
                    <SelectItem value="purchasedWhen">Purchase Date</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger className="w-full sm:w-[150px] h-11 text-base">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {displayedItems.length === 0 ? (
              <div className="text-center py-8 text-sm sm:text-base text-muted-foreground">
                {selectedArea
                  ? "No items found. Click 'Add Item' to start tracking!"
                  : "Select an area or container from the sidebar above to view items."}
              </div>
            ) : groupedItems ? (
              // Grouped view for "All Items"
              <div className="space-y-6">
                {groupedItems.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    {/* Container Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3 pb-2 border-b">
                      <div className="flex items-center gap-3 flex-1">
                        <PackageIcon className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-base sm:text-lg">
                            {group.container ? group.container.name : "No Container"}
                          </h3>
                          {group.container && (
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {getAreaName(group.container.areaId)} • {group.container.type}
                              {group.container.brand && ` • ${group.container.brand}`}
                              {group.container.model && ` ${group.container.model}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{group.items.length} items</Badge>
                        {group.container && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditContainer(group.container!)}
                            className="h-9"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Items in this container */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Last Year</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Gift?</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>Where</TableHead>
                            <TableHead>When</TableHead>
                            <TableHead>Keep Until</TableHead>
                            <TableHead>Kept?</TableHead>
                            <TableHead>Sold Date</TableHead>
                            <TableHead>Sold Price</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.filter(item => !item.parentItemId).map(item => renderItemRow(item))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Regular table view for filtered results
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Last Year</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Gift?</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Where</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead>Keep Until</TableHead>
                      <TableHead>Kept?</TableHead>
                      <TableHead>Sold Date</TableHead>
                      <TableHead>Sold Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedItems.filter(item => !item.parentItemId).map(item => renderItemRow(item))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AreaManager
        open={showAreaDialog}
        onOpenChange={setShowAreaDialog}
        onAreaAdded={loadData}
        editingArea={editingArea}
      />

      <ContainerManager
        open={showContainerDialog}
        onOpenChange={setShowContainerDialog}
        onContainerAdded={loadData}
        areaId={selectedArea || ""}
        editingContainer={editingContainer}
      />

      <SectionManager
        open={showSectionDialog}
        onOpenChange={setShowSectionDialog}
        onSectionAdded={loadData}
        containerId={selectedContainer || ""}
        editingSection={editingSection}
      />

      <ItemForm
        open={showItemDialog}
        onOpenChange={setShowItemDialog}
        onItemAdded={loadData}
        areas={areas}
        containers={containers}
        items={items}
        selectedArea={selectedArea || undefined}
        selectedContainer={selectedContainer || undefined}
        editingItem={editingItem}
      />
    </div>
  )
}
