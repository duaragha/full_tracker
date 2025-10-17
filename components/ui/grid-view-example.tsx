/**
 * Grid View Usage Examples
 *
 * This file contains example implementations of the Grid View components.
 * Use these as templates for implementing grid views in your application.
 */

"use client"

import * as React from "react"
import {
  GridView,
  ViewToggle,
  MediaDetailModal,
  useViewMode,
  useInfiniteScroll,
  type GridViewItem,
} from "@/components/ui"
import { Pencil, Trash2, Calendar, Clock, Star, Film } from "lucide-react"

// ============================================================================
// Example 1: Basic Grid View
// ============================================================================

export function BasicGridExample() {
  const items: GridViewItem[] = [
    {
      id: "1",
      title: "Inception",
      imageUrl: "/posters/inception.jpg",
      subtitle: "2010",
      badge: "Watched",
      badgeVariant: "secondary",
      metadata: [
        { label: "Rating", value: "8.8/10" },
        { label: "Runtime", value: "148 min" },
        { label: "Genre", value: "Sci-Fi" },
      ],
    },
    {
      id: "2",
      title: "The Dark Knight",
      imageUrl: "/posters/dark-knight.jpg",
      subtitle: "2008",
      badge: "Watching",
      badgeVariant: "default",
      metadata: [
        { label: "Rating", value: "9.0/10" },
        { label: "Runtime", value: "152 min" },
        { label: "Genre", value: "Action" },
      ],
    },
    // Add more items...
  ]

  const handleItemClick = (item: GridViewItem) => {
    console.log("Clicked:", item.title)
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Movies</h1>
      <GridView
        items={items}
        onItemClick={handleItemClick}
        aspectRatio="portrait"
      />
    </div>
  )
}

// ============================================================================
// Example 2: Grid with View Toggle
// ============================================================================

export function GridWithToggleExample() {
  const [viewMode, setViewMode] = useViewMode("grid", "movies-view-mode")
  const [isLoading, setIsLoading] = React.useState(false)

  const items: GridViewItem[] = [
    // ... your items
  ]

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Library</h1>
        <ViewToggle
          value={viewMode}
          onValueChange={setViewMode}
          storageKey="movies-view-mode"
        />
      </div>

      {viewMode === "grid" ? (
        <GridView
          items={items}
          onItemClick={(item) => console.log(item)}
          isLoading={isLoading}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Table view implementation here</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Example 3: Grid with Detail Modal
// ============================================================================

export function GridWithModalExample() {
  const [selectedItem, setSelectedItem] = React.useState<GridViewItem | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)

  const items: GridViewItem[] = [
    {
      id: "1",
      title: "Inception",
      imageUrl: "/posters/inception.jpg",
      subtitle: "2010",
      badge: "Watched",
      metadata: [
        { label: "Rating", value: "8.8/10" },
        { label: "Runtime", value: "148 min" },
      ],
    },
    // ... more items
  ]

  const handleItemClick = (item: GridViewItem) => {
    setSelectedItem(item)
    setModalOpen(true)
  }

  const handleEdit = () => {
    console.log("Edit:", selectedItem?.title)
    setModalOpen(false)
  }

  const handleDelete = () => {
    console.log("Delete:", selectedItem?.title)
    setModalOpen(false)
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Movies</h1>

      <GridView items={items} onItemClick={handleItemClick} />

      <MediaDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={selectedItem?.title || ""}
        subtitle={selectedItem?.subtitle}
        imageUrl={selectedItem?.imageUrl || ""}
        posterAspectRatio="portrait"
        badges={
          selectedItem?.badge
            ? [{ label: selectedItem.badge, variant: selectedItem.badgeVariant || "default" }]
            : []
        }
        rating={{ value: 8.8, max: 10, label: "IMDB Rating" }}
        primaryFields={[
          {
            label: "Release Date",
            value: "July 16, 2010",
            icon: <Calendar className="h-4 w-4" />,
          },
          {
            label: "Runtime",
            value: "148 minutes",
            icon: <Clock className="h-4 w-4" />,
          },
          {
            label: "Director",
            value: "Christopher Nolan",
            icon: <Film className="h-4 w-4" />,
          },
          {
            label: "Genre",
            value: "Science Fiction, Action",
            fullWidth: true,
          },
        ]}
        secondaryFields={[
          { label: "Budget", value: "$160 million" },
          { label: "Box Office", value: "$836.8 million" },
          { label: "Language", value: "English" },
        ]}
        notes="A mind-bending thriller about dream infiltration. One of Nolan's best works."
        actions={[
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: handleEdit,
            variant: "outline",
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: handleDelete,
            variant: "destructive",
          },
        ]}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Plot</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A thief who steals corporate secrets through the use of dream-sharing technology
            is given the inverse task of planting an idea into the mind of a C.E.O.
          </p>
        </div>
      </MediaDetailModal>
    </div>
  )
}

// ============================================================================
// Example 4: Grid with Infinite Scroll
// ============================================================================

export function GridWithInfiniteScrollExample() {
  const [items, setItems] = React.useState<GridViewItem[]>([])
  const [page, setPage] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(true)

  // Simulate fetching data
  const fetchMoreItems = async () => {
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const newItems: GridViewItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: `${page}-${i}`,
      title: `Movie ${page * 12 + i}`,
      imageUrl: `/posters/movie-${page * 12 + i}.jpg`,
      subtitle: `${2020 + i}`,
      badge: i % 3 === 0 ? "Watched" : undefined,
      metadata: [
        { label: "Rating", value: `${(7 + Math.random() * 2).toFixed(1)}/10` },
        { label: "Runtime", value: `${90 + Math.floor(Math.random() * 60)} min` },
      ],
    }))

    setItems([...items, ...newItems])
    setPage(page + 1)
    setHasMore(page < 5) // Stop after 5 pages
    setIsLoading(false)
  }

  // Load initial items
  React.useEffect(() => {
    if (items.length === 0) {
      fetchMoreItems()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollRef = useInfiniteScroll(fetchMoreItems, 400, isLoading, hasMore)

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto">
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Infinite Scroll Movies</h1>

        <GridView
          items={items}
          onItemClick={(item) => console.log(item)}
          isLoading={false}
        />

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading more items...</p>
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No more items to load</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Example 5: Grid with Different Aspect Ratios
// ============================================================================

export function GridWithAspectRatiosExample() {
  const [aspectRatio, setAspectRatio] = React.useState<"portrait" | "square" | "landscape">(
    "portrait"
  )

  const movieItems: GridViewItem[] = [
    // Movie items with 2:3 aspect ratio
    { id: "1", title: "Inception", imageUrl: "/posters/inception.jpg", subtitle: "2010" },
  ]

  const albumItems: GridViewItem[] = [
    // Album items with 1:1 aspect ratio
    { id: "1", title: "Abbey Road", imageUrl: "/albums/abbey-road.jpg", subtitle: "The Beatles" },
  ]

  const videoItems: GridViewItem[] = [
    // Video items with 16:9 aspect ratio
    { id: "1", title: "Tutorial", imageUrl: "/videos/tutorial.jpg", subtitle: "10:30" },
  ]

  return (
    <div className="container mx-auto p-6 space-y-12">
      <div>
        <h2 className="text-2xl font-bold mb-6">Movies (2:3 Portrait)</h2>
        <GridView items={movieItems} aspectRatio="portrait" />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Albums (1:1 Square)</h2>
        <GridView items={albumItems} aspectRatio="square" />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Videos (16:9 Landscape)</h2>
        <GridView items={videoItems} aspectRatio="landscape" />
      </div>
    </div>
  )
}

// ============================================================================
// Example 6: Grid with Loading and Empty States
// ============================================================================

export function GridWithStatesExample() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [items, setItems] = React.useState<GridViewItem[]>([])

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
      // setItems([]) // Leave empty to show empty state
      // OR
      // setItems([ /* your items */ ]) // Add items to show grid
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleAddItem = () => {
    console.log("Add new item")
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Library</h1>

      <GridView
        items={items}
        isLoading={isLoading}
        skeletonCount={18}
        emptyMessage="No items in your library yet"
        emptyActionLabel="Add Your First Item"
        onEmptyAction={handleAddItem}
      />
    </div>
  )
}
