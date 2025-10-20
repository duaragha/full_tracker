"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MediaCard } from "@/components/ui/media-card"
import { MediaGridSkeleton } from "@/components/ui/media-card-skeleton"
import { Film, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * GridViewItem interface
 *
 * Represents a media item to be displayed in the grid.
 * This is a simplified wrapper around MediaCardProps for easier usage.
 */
export interface GridViewItem {
  id: string
  title: string
  imageUrl: string
  subtitle?: string
  metadata?: Array<{ label: string; value: string | number }>
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
}

/**
 * GridView Component Props
 *
 * @interface GridViewProps
 * @property {GridViewItem[]} items - Array of media items to display
 * @property {(item: GridViewItem) => void} [onItemClick] - Click handler for grid items
 * @property {boolean} [isLoading] - Loading state (shows skeleton grid)
 * @property {"portrait" | "square" | "landscape"} [aspectRatio] - Aspect ratio for all cards (default: "portrait")
 * @property {boolean} [showHoverOverlay] - Whether to show hover overlays on cards (default: true)
 * @property {string} [emptyMessage] - Message to display when no items (default: "No items to display")
 * @property {() => void} [onEmptyAction] - Optional action for empty state button
 * @property {string} [emptyActionLabel] - Label for empty state action button
 * @property {number} [skeletonCount] - Number of skeleton cards to show when loading (default: 12)
 * @property {string} [className] - Additional CSS classes for the grid container
 */
export interface GridViewProps {
  items: GridViewItem[]
  onItemClick?: (item: GridViewItem) => void
  isLoading?: boolean
  aspectRatio?: "portrait" | "square" | "landscape"
  showHoverOverlay?: boolean
  emptyMessage?: string
  onEmptyAction?: () => void
  emptyActionLabel?: string
  skeletonCount?: number
  className?: string
}

/**
 * EmptyGridState Component
 *
 * Displays when the grid has no items to show.
 */
function EmptyGridState({
  message = "No items to display",
  actionLabel,
  onAction,
}: {
  message?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-full bg-muted p-6 mb-4">
        <Film className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {message}
      </h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Start building your collection by searching and adding items.
      </p>
      {onAction && actionLabel && (
        <Button onClick={onAction} size="lg">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

/**
 * GridView Component
 *
 * A responsive, accessible grid layout for displaying media items (movies, TV shows, books, games, music).
 * Implements industry-standard design patterns from Netflix, Spotify, and Steam.
 *
 * Features:
 * - Responsive breakpoints: 2 → 3 → 4 → 5 → 6 → 7 columns
 * - Mobile-first design with proper touch targets
 * - Loading states with skeleton screens
 * - Empty states with optional call-to-action
 * - Full keyboard navigation support
 * - WCAG 2.1 AA compliant accessibility
 * - GPU-accelerated hover effects
 * - Lazy-loaded images
 *
 * Responsive Grid Layout:
 * - Mobile (< 640px): 4 columns, 12px gap
 * - Small (640px - 768px): 5 columns, 16px gap
 * - Medium (768px - 1024px): 6 columns, 20px gap
 * - Large (1024px - 1280px): 7 columns, 24px gap
 * - XL (1280px - 1536px): 8 columns, 24px gap
 * - 2XL (≥ 1536px): 9 columns, 28px gap
 *
 * @example
 * ```tsx
 * const items = [
 *   {
 *     id: "1",
 *     title: "Inception",
 *     imageUrl: "/posters/inception.jpg",
 *     subtitle: "2010",
 *     badge: "Watched",
 *     metadata: [
 *       { label: "Rating", value: "8.8/10" },
 *       { label: "Runtime", value: "148 min" }
 *     ]
 *   }
 * ]
 *
 * <GridView
 *   items={items}
 *   onItemClick={(item) => console.log(item)}
 *   aspectRatio="portrait"
 *   isLoading={false}
 * />
 * ```
 */
export function GridView({
  items,
  onItemClick,
  isLoading = false,
  aspectRatio = "portrait",
  showHoverOverlay = true,
  emptyMessage = "No items to display",
  onEmptyAction,
  emptyActionLabel = "Add Item",
  skeletonCount = 12,
  className,
}: GridViewProps) {
  // Loading State
  if (isLoading) {
    return (
      <MediaGridSkeleton
        count={skeletonCount}
        aspectRatio={aspectRatio}
        className={className}
      />
    )
  }

  // Empty State
  if (items.length === 0) {
    return (
      <EmptyGridState
        message={emptyMessage}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    )
  }

  // Grid View
  return (
    <div
      className={cn(
        // Responsive grid layout with gaps
        "grid",
        "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9",
        "gap-3 sm:gap-4 md:gap-5 lg:gap-6 2xl:gap-7",
        className
      )}
      role="grid"
      aria-label="Media grid"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="gridcell"
        >
          <MediaCard
            id={item.id}
            title={item.title}
            imageUrl={item.imageUrl}
            subtitle={item.subtitle}
            metadata={item.metadata}
            badge={item.badge}
            badgeVariant={item.badgeVariant}
            aspectRatio={aspectRatio}
            showHoverOverlay={showHoverOverlay}
            onClick={() => onItemClick?.(item)}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * useInfiniteScroll Hook
 *
 * Custom hook for implementing infinite scroll functionality.
 * Triggers onLoadMore when user scrolls near the bottom of the container.
 *
 * @param onLoadMore - Callback function to load more items
 * @param threshold - Distance from bottom (in px) to trigger loading (default: 400)
 * @param isLoading - Loading state to prevent multiple loads
 * @param hasMore - Whether there are more items to load
 *
 * @example
 * ```tsx
 * const scrollRef = useInfiniteScroll(
 *   () => loadMoreItems(),
 *   400,
 *   isLoading,
 *   hasMore
 * )
 *
 * <div ref={scrollRef}>
 *   <GridView items={items} />
 * </div>
 * ```
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  threshold = 400,
  isLoading = false,
  hasMore = true
) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !hasMore || isLoading) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (distanceFromBottom < threshold) {
        onLoadMore()
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [onLoadMore, threshold, isLoading, hasMore])

  return containerRef
}
