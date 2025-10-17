"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Props for the MediaCard component
 *
 * @interface MediaCardProps
 * @property {string} id - Unique identifier for the card
 * @property {string} title - Title of the media item
 * @property {string} imageUrl - URL of the poster/cover image
 * @property {string} [subtitle] - Optional subtitle (e.g., year, artist)
 * @property {Array<{label: string, value: string | number}>} [metadata] - Optional metadata to display on hover
 * @property {string} [badge] - Optional badge text (e.g., "Watched", "In Progress")
 * @property {"default" | "secondary" | "destructive" | "outline"} [badgeVariant] - Badge styling variant
 * @property {"portrait" | "square" | "landscape"} [aspectRatio] - Aspect ratio of the card (default: "portrait")
 * @property {boolean} [showHoverOverlay] - Whether to show the gradient overlay on hover (default: true)
 * @property {() => void} [onClick] - Click handler for the card
 * @property {string} [className] - Additional CSS classes
 */
export interface MediaCardProps {
  id: string
  title: string
  imageUrl: string
  subtitle?: string
  metadata?: Array<{ label: string; value: string | number }>
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  aspectRatio?: "portrait" | "square" | "landscape"
  showHoverOverlay?: boolean
  onClick?: () => void
  className?: string
}

/**
 * MediaCard Component
 *
 * A reusable card component for displaying media items (movies, TV shows, books, games, music)
 * with hover effects, metadata overlay, and accessibility features.
 *
 * Features:
 * - Three-level hover effects: card lift (scale), image zoom, content reveal
 * - Responsive aspect ratios for different media types
 * - Lazy-loaded images with error handling
 * - Full keyboard navigation support
 * - WCAG 2.1 AA compliant accessibility
 * - Reduced motion support
 * - GPU-accelerated animations
 *
 * @example
 * ```tsx
 * <MediaCard
 *   id="movie-123"
 *   title="Inception"
 *   imageUrl="/posters/inception.jpg"
 *   subtitle="2010"
 *   badge="Watched"
 *   metadata={[
 *     { label: "Rating", value: "8.8/10" },
 *     { label: "Runtime", value: "148 min" }
 *   ]}
 *   onClick={() => console.log("Card clicked")}
 * />
 * ```
 */
export function MediaCard({
  title,
  imageUrl,
  subtitle,
  metadata,
  badge,
  badgeVariant = "default",
  aspectRatio = "portrait",
  showHoverOverlay = true,
  onClick,
  className,
}: MediaCardProps) {
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

  const getBadgeClasses = () => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-md backdrop-blur-sm"

    switch (badgeVariant) {
      case "secondary":
        return cn(baseClasses, "bg-secondary/90 text-secondary-foreground")
      case "destructive":
        return cn(baseClasses, "bg-destructive/90 text-destructive-foreground")
      case "outline":
        return cn(baseClasses, "bg-background/90 border border-border text-foreground")
      default:
        return cn(baseClasses, "bg-primary/90 text-primary-foreground")
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group cursor-pointer focus-visible:outline-none",
        className
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
      aria-label={`${title}${subtitle ? ` - ${subtitle}` : ""}`}
    >
      <div className="space-y-2">
        {/* Image Container with Three-Level Hover Effects */}
        <div className="relative overflow-hidden rounded-lg bg-muted">
          {/* Level 1: Card Lift - Scale the entire container */}
          <div
            className={cn(
              "relative w-full",
              getAspectRatioClass(),
              // Level 1: Lift effect (scale entire card)
              "transition-all duration-300 ease-out",
              "group-hover:scale-105",
              "group-focus-visible:scale-105",
              // Shadow enhancement on hover
              "group-hover:shadow-2xl",
              // Respect reduced motion preferences
              "motion-reduce:transition-none",
              "motion-reduce:group-hover:scale-100"
            )}
          >
            {/* Level 2: Image Zoom - Scale the image inside */}
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, (max-width: 1536px) 16vw, 14vw"
                className={cn(
                  "object-cover",
                  // Level 2: Image zoom effect
                  "transition-transform duration-500 ease-out",
                  "group-hover:scale-110",
                  "group-focus-visible:scale-110",
                  // Respect reduced motion
                  "motion-reduce:transition-none",
                  "motion-reduce:group-hover:scale-100"
                )}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder-image.png"
                }}
              />
            </div>

            {/* Badge Overlay */}
            {badge && (
              <div className="absolute top-2 right-2 z-20">
                <span className={getBadgeClasses()}>
                  {badge}
                </span>
              </div>
            )}

            {/* Level 3: Content Reveal - Gradient overlay with metadata */}
            {showHoverOverlay && (
              <div
                className={cn(
                  "absolute inset-0 z-10",
                  "bg-gradient-to-t from-black/90 via-black/50 to-transparent",
                  // Fade in overlay
                  "opacity-0",
                  "group-hover:opacity-100",
                  "group-focus-visible:opacity-100",
                  "transition-opacity duration-300 ease-out",
                  // Content positioning
                  "flex flex-col justify-end p-4",
                  // Respect reduced motion
                  "motion-reduce:transition-none"
                )}
              >
                {/* Metadata display */}
                {metadata && metadata.length > 0 && (
                  <div className="space-y-1.5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ease-out motion-reduce:translate-y-0">
                    {metadata.slice(0, 3).map((meta, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs text-white/90"
                      >
                        <span className="font-medium">{meta.label}:</span>
                        <span className="font-normal">{meta.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Focus Ring */}
            <div
              className={cn(
                "absolute inset-0 rounded-lg",
                "ring-2 ring-offset-2 ring-offset-background ring-primary",
                "opacity-0 group-focus-visible:opacity-100",
                "transition-opacity duration-200",
                "pointer-events-none z-30"
              )}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Title and Subtitle */}
        <div className="space-y-1 px-1">
          <h3
            className={cn(
              "font-medium text-sm leading-tight line-clamp-2",
              "transition-colors duration-200",
              "group-hover:text-primary",
              "group-focus-visible:text-primary"
            )}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
