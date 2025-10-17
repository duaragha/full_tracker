/**
 * UI Components Index
 *
 * Centralized exports for all reusable UI components
 */

// Grid View Components
export { GridView, useInfiniteScroll } from "./grid-view"
export type { GridViewProps, GridViewItem } from "./grid-view"

export { MediaCard } from "./media-card"
export type { MediaCardProps } from "./media-card"

export { MediaCardSkeleton, MediaGridSkeleton } from "./media-card-skeleton"
export type { MediaCardSkeletonProps, MediaGridSkeletonProps } from "./media-card-skeleton"

export { ViewToggle, useViewMode } from "./view-toggle"
export type { ViewToggleProps, ViewMode } from "./view-toggle"

export { MediaDetailModal } from "./media-detail-modal"
export type {
  MediaDetailModalProps,
  MediaDetailField,
  MediaDetailAction
} from "./media-detail-modal"

// Base UI Components
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./card"

export { Skeleton } from "./skeleton"
export { Button } from "./button"
export { Badge } from "./badge"
