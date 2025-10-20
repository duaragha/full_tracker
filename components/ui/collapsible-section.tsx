"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  storageKey?: string
  className?: string
  count?: number
}

/**
 * CollapsibleSection Component
 *
 * A reusable collapsible section with:
 * - Smooth animations
 * - Optional state persistence via localStorage
 * - Item count badge
 * - Chevron rotation indicator
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  storageKey,
  className,
  count,
}: CollapsibleSectionProps) {
  // Initialize state from localStorage if available
  const [isOpen, setIsOpen] = React.useState(() => {
    if (storageKey && typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey)
      return stored !== null ? stored === "true" : defaultOpen
    }
    return defaultOpen
  })

  // Persist state to localStorage when it changes
  React.useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(storageKey, String(isOpen))
    }
  }, [isOpen, storageKey])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("space-y-3", className)}>
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center justify-between text-lg font-semibold hover:opacity-70 transition-opacity group"
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${title} section`}
        >
          <div className="flex items-center gap-2">
            <span>{title}</span>
            {count !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({count})
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              isOpen ? "transform rotate-180" : ""
            )}
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2"
        )}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
