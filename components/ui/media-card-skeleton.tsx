"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Props for the MediaCardSkeleton component
 *
 * @interface MediaCardSkeletonProps
 * @property {"portrait" | "square" | "landscape"} [aspectRatio] - Aspect ratio of the skeleton (default: "portrait")
 * @property {boolean} [showSubtitle] - Whether to show subtitle skeleton (default: true)
 * @property {string} [className] - Additional CSS classes
 */
export interface MediaCardSkeletonProps {
  aspectRatio?: "portrait" | "square" | "landscape"
  showSubtitle?: boolean
  className?: string
}

/**
 * MediaCardSkeleton Component
 *
 * A loading state skeleton component for MediaCard.
 * Matches the layout and aspect ratio of the actual card for seamless loading transitions.
 *
 * @example
 * ```tsx
 * <MediaCardSkeleton aspectRatio="portrait" />
 * ```
 */
export function MediaCardSkeleton({
  aspectRatio = "portrait",
  showSubtitle = true,
  className,
}: MediaCardSkeletonProps) {
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "portrait":
        return "aspect-[2/3]"
      case "square":
        return "aspect-square"
      case "landscape":
        return "aspect-video"
      default:
        return "aspect-[2/3]"
    }
  }

  return (
    <div className={cn("space-y-2", className)} aria-label="Loading media card">
      {/* Image Skeleton */}
      <Skeleton className={cn("w-full rounded-lg", getAspectRatioClass())} />

      {/* Title and Subtitle Skeletons */}
      <div className="space-y-2 px-1">
        {/* Title skeleton - 2 lines */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Subtitle skeleton */}
        {showSubtitle && (
          <Skeleton className="h-3 w-1/2" />
        )}
      </div>
    </div>
  )
}

/**
 * Props for the MediaGridSkeleton component
 *
 * @interface MediaGridSkeletonProps
 * @property {number} [count] - Number of skeleton cards to display (default: 12)
 * @property {"portrait" | "square" | "landscape"} [aspectRatio] - Aspect ratio of the skeletons (default: "portrait")
 * @property {boolean} [showSubtitle] - Whether to show subtitle skeleton (default: true)
 * @property {string} [className] - Additional CSS classes for the grid container
 */
export interface MediaGridSkeletonProps {
  count?: number
  aspectRatio?: "portrait" | "square" | "landscape"
  showSubtitle?: boolean
  className?: string
}

/**
 * MediaGridSkeleton Component
 *
 * A grid of loading state skeletons for the MediaGrid component.
 * Displays a responsive grid layout matching the actual grid breakpoints.
 *
 * Responsive Grid:
 * - Mobile (< 640px): 2 columns
 * - Tablet (640px - 768px): 3 columns
 * - Medium (768px - 1024px): 4 columns
 * - Large (1024px - 1280px): 5 columns
 * - XL (1280px - 1536px): 6 columns
 * - 2XL (≥ 1536px): 7 columns
 *
 * @example
 * ```tsx
 * <MediaGridSkeleton count={18} aspectRatio="portrait" />
 * ```
 */
export function MediaGridSkeleton({
  count = 12,
  aspectRatio = "portrait",
  showSubtitle = true,
  className,
}: MediaGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 2xl:gap-7",
        "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading media items"
    >
      {Array.from({ length: count }).map((_, index) => (
        <MediaCardSkeleton
          key={index}
          aspectRatio={aspectRatio}
          showSubtitle={showSubtitle}
        />
      ))}
    </div>
  )
}
