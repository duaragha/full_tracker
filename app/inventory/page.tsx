"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Package as PackageIcon, AlertTriangle } from "lucide-react"
import { Area, Container, InventoryItem } from "@/types/inventory"
import {
  getAreasAction,
  getContainersAction,
  getInventoryItemsAction,
  deleteAreaAction,
  deleteContainerAction,
  deleteInventoryItemAction,
} from "@/app/actions/inventory"
import { AreaManager } from "@/components/area-manager"
import { ContainerManager } from "@/components/container-manager"
import { ItemForm } from "@/components/item-form"
import { PinAuth } from "@/components/pin-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function InventoryPage() {
  const [mounted, setMounted] = React.useState(false)
  const [isUnlocked, setIsUnlocked] = React.useState(false)
  const [areas, setAreas] = React.useState<Area[]>([])
  const [containers, setContainers] = React.useState<Container[]>([])
  const [items, setItems] = React.useState<InventoryItem[]>([])

  const [selectedArea, setSelectedArea] = React.useState<string | null>(null)
  const [selectedContainer, setSelectedContainer] = React.useState<string | null>(null)
  const [expandedAreas, setExpandedAreas] = React.useState<Set<string>>(new Set())

  const [showAreaDialog, setShowAreaDialog] = React.useState(false)
  const [showContainerDialog, setShowContainerDialog] = React.useState(false)
  const [showItemDialog, setShowItemDialog] = React.useState(false)

  const [editingArea, setEditingArea] = React.useState<Area | undefined>()
  const [editingContainer, setEditingContainer] = React.useState<Container | undefined>()
  const [editingItem, setEditingItem] = React.useState<InventoryItem | undefined>()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"name" | "cost" | "purchasedWhen">("name")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const loadData = async () => {
    const [areasData, containersData, itemsData] = await Promise.all([
      getAreasAction(),
      getContainersAction(),
      getInventoryItemsAction()
    ])
    setAreas(areasData)
    setContainers(containersData)
    setItems(itemsData)
  }

  const handleWipeInventory = async () => {
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
  }

  React.useEffect(() => {
    setMounted(true)
    // Check if already unlocked in this session
    const unlocked = sessionStorage.getItem("inventory_unlocked")
    if (unlocked === "true") {
      setIsUnlocked(true)
      loadData()
    }
  }, [])

  const handleUnlock = () => {
    setIsUnlocked(true)
    loadData()
  }

  // Helper functions
  const getAreaName = (areaId: string) => areas.find(a => a.id === areaId)?.name || "Unknown"
  const getContainerName = (containerId: string) => containers.find(c => c.id === containerId)?.name || "Unknown"
  const getContainersByArea = (areaId: string) => containers.filter(c => c.areaId === areaId)

  // All hooks must be called before any conditional returns
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

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
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

    return sorted
  }, [items, selectedArea, selectedContainer, searchQuery, sortBy, sortOrder])

  // Group items by container for "All Items" view
  const groupedItems = React.useMemo(() => {
    if (selectedContainer || selectedArea) {
      // Don't group if filtering by area or container
      return null
    }

    // Group items by container
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
  }, [displayedItems, containers, selectedContainer, selectedArea, areas])

  const totalItems = items.length
  const itemsUsedInLastYear = items.filter(i => i.usedInLastYear).length
  const totalCost = items.filter(i => i.kept).reduce((total, item) => total + (item.cost || 0), 0)
  const giftsReceived = items.filter(i => i.isGift).length
  const itemsToDiscard = items.filter(i => !i.usedInLastYear && i.kept).length

  if (!mounted) {
    return null
  }

  // Show PIN authentication if not unlocked
  if (!isUnlocked) {
    return <PinAuth onUnlock={handleUnlock} />
  }

  const toggleArea = (areaId: string) => {
    const newExpanded = new Set(expandedAreas)
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId)
    } else {
      newExpanded.add(areaId)
    }
    setExpandedAreas(newExpanded)
  }

  const handleAddArea = () => {
    setEditingArea(undefined)
    setShowAreaDialog(true)
  }

  const handleEditArea = (area: Area) => {
    setEditingArea(area)
    setShowAreaDialog(true)
  }

  const handleDeleteArea = async (id: string) => {
    if (confirm("Delete this area and all its containers and items?")) {
      await deleteAreaAction(Number(id))
      await loadData()
      if (selectedArea === id) {
        setSelectedArea(null)
        setSelectedContainer(null)
      }
    }
  }

  const handleAddContainer = (areaId: string) => {
    setSelectedArea(areaId)
    setEditingContainer(undefined)
    setShowContainerDialog(true)
  }

  const handleEditContainer = (container: Container) => {
    setEditingContainer(container)
    setShowContainerDialog(true)
  }

  const handleDeleteContainer = async (id: string) => {
    if (confirm("Delete this container and all its items?")) {
      await deleteContainerAction(Number(id))
      await loadData()
      if (selectedContainer === id) {
        setSelectedContainer(null)
      }
    }
  }

  const handleAddItem = () => {
    setEditingItem(undefined)
    setShowItemDialog(true)
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    setShowItemDialog(true)
  }

  const handleDeleteItem = async (id: string) => {
    if (confirm("Delete this item?")) {
      await deleteInventoryItemAction(Number(id))
      await loadData()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Room Inventory</h1>
          <p className="text-muted-foreground">Organize and track all your belongings</p>
        </div>
        <Button
          variant="destructive"
          onClick={handleWipeInventory}
          disabled={items.length === 0}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Clear All Inventory
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle>{totalItems}</CardTitle>
            <CardDescription>Total Items</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{itemsUsedInLastYear}</CardTitle>
            <CardDescription>Used in Last Year</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>${totalCost.toFixed(2)}</CardTitle>
            <CardDescription>Total Cost</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{giftsReceived}</CardTitle>
            <CardDescription>Gifts Received</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{itemsToDiscard}</CardTitle>
            <CardDescription>To Discard</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Left Sidebar - Tree View */}
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Areas & Containers</CardTitle>
              <Button size="sm" onClick={handleAddArea}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {areas.map((area) => {
                const areaContainers = getContainersByArea(area.id)
                const isExpanded = expandedAreas.has(area.id)
                const isSelected = selectedArea === area.id && !selectedContainer

                return (
                  <div key={area.id}>
                    <div
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                        isSelected ? "bg-muted" : ""
                      }`}
                    >
                      <button
                        onClick={() => toggleArea(area.id)}
                        className="p-0 hover:bg-transparent"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <div
                        className="flex-1"
                        onClick={() => {
                          setSelectedArea(area.id)
                          setSelectedContainer(null)
                        }}
                      >
                        <span className="font-medium text-sm">{area.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {area.type}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddContainer(area.id)
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditArea(area)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteArea(area.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="ml-6 mt-1 space-y-1">
                        {areaContainers.map((container) => {
                          const isContainerSelected = selectedContainer === container.id

                          return (
                            <div
                              key={container.id}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                                isContainerSelected ? "bg-muted" : ""
                              }`}
                              onClick={() => {
                                setSelectedArea(area.id)
                                setSelectedContainer(container.id)
                              }}
                            >
                              <PackageIcon className="h-4 w-4" />
                              <span className="flex-1 text-sm">{container.name}</span>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditContainer(container)
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteContainer(container.id)
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
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
        <Card className="md:col-span-4">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedContainer
                    ? `Items in ${getContainerName(selectedContainer)}`
                    : selectedArea
                    ? `Items in ${getAreaName(selectedArea)}`
                    : "All Items"}
                </CardTitle>
                <Button onClick={handleAddItem} disabled={!selectedArea}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
              <div className="flex gap-4">
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="cost">Cost</SelectItem>
                    <SelectItem value="purchasedWhen">Purchase Date</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger className="w-[150px]">
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
          <CardContent>
            {displayedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {selectedArea
                  ? "No items found. Click 'Add Item' to start tracking!"
                  : "Select an area or container from the left sidebar to view items."}
              </div>
            ) : groupedItems ? (
              // Grouped view for "All Items"
              <div className="space-y-6">
                {groupedItems.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    {/* Container Header */}
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b">
                      <PackageIcon className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {group.container ? group.container.name : "No Container"}
                        </h3>
                        {group.container && (
                          <p className="text-sm text-muted-foreground">
                            {getAreaName(group.container.areaId)} • {group.container.type}
                            {group.container.brand && ` • ${group.container.brand}`}
                            {group.container.model && ` ${group.container.model}`}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{group.items.length} items</Badge>
                      {group.container && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditContainer(group.container!)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
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
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{item.type}</Badge>
                              </TableCell>
                              <TableCell>{item.usedInLastYear ? "✓" : "✗"}</TableCell>
                              <TableCell>${item.cost.toFixed(2)}</TableCell>
                              <TableCell>{item.isGift ? "✓" : "✗"}</TableCell>
                              <TableCell>{item.giftFrom || "-"}</TableCell>
                              <TableCell className="text-sm">{item.purchasedWhere}</TableCell>
                              <TableCell className="text-sm">
                                {new Date(item.purchasedWhen).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditItem(item)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
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
                    {displayedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.type}</Badge>
                        </TableCell>
                        <TableCell>{item.usedInLastYear ? "✓" : "✗"}</TableCell>
                        <TableCell className="text-sm">
                          {getAreaName(item.location.areaId)} /{" "}
                          {getContainerName(item.location.containerId)}
                        </TableCell>
                        <TableCell>${item.cost.toFixed(2)}</TableCell>
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
                        <TableCell>{item.kept ? "✓" : "✗"}</TableCell>
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
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditItem(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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

      <ItemForm
        open={showItemDialog}
        onOpenChange={setShowItemDialog}
        onItemAdded={loadData}
        areas={areas}
        containers={containers}
        selectedArea={selectedArea || undefined}
        selectedContainer={selectedContainer || undefined}
        editingItem={editingItem}
      />
    </div>
  )
}
