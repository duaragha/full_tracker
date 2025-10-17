"use client"

import * as React from "react"
import { LayoutGrid, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ViewMode = "table" | "grid"

export interface ViewToggleProps {
  value: ViewMode
  onValueChange: (value: ViewMode) => void
  storageKey?: string
  className?: string
  disabled?: boolean
  labels?: {
    table?: string
    grid?: string
  }
}

export function ViewToggle({
  value,
  onValueChange,
  storageKey,
  className,
  disabled = false,
  labels = {
    table: "Table View",
    grid: "Grid View",
  },
}: ViewToggleProps) {
  // Sync with localStorage if key provided
  React.useEffect(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored === "table" || stored === "grid") {
          onValueChange(stored)
        }
      } catch (error) {
        console.error("Failed to read view preference from localStorage:", error)
      }
    }
  }, [storageKey, onValueChange])

  const handleToggle = (newValue: ViewMode) => {
    if (disabled || newValue === value) return

    onValueChange(newValue)

    // Save to localStorage if key provided
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, newValue)
      } catch (error) {
        console.error("Failed to save view preference to localStorage:", error)
      }
    }
  }

  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-lg border p-1 bg-muted/50", className)}
      role="tablist"
      aria-label="View mode toggle"
    >
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => handleToggle("table")}
        className={cn(
          "h-8 px-3 rounded-md transition-all",
          value === "table"
            ? "bg-background shadow-sm"
            : "hover:bg-transparent hover:text-foreground"
        )}
        aria-label={labels.table}
        aria-selected={value === "table"}
        role="tab"
      >
        <Table2 className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Table</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => handleToggle("grid")}
        className={cn(
          "h-8 px-3 rounded-md transition-all",
          value === "grid"
            ? "bg-background shadow-sm"
            : "hover:bg-transparent hover:text-foreground"
        )}
        aria-label={labels.grid}
        aria-selected={value === "grid"}
        role="tab"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Grid</span>
      </Button>
    </div>
  )
}

/**
 * Hook to manage view mode state with localStorage persistence
 *
 * @param defaultValue - Initial view mode (default: "table")
 * @param storageKey - Optional localStorage key for persistence
 * @returns [viewMode, setViewMode] tuple
 *
 * @example
 * const [viewMode, setViewMode] = useViewMode("table", "movies-view-mode")
 *
 * <ViewToggle
 *   value={viewMode}
 *   onValueChange={setViewMode}
 *   storageKey="movies-view-mode"
 * />
 */
export function useViewMode(
  defaultValue: ViewMode = "table",
  storageKey?: string
): [ViewMode, (value: ViewMode) => void] {
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultValue)
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Load from localStorage on mount
  React.useEffect(() => {
    if (storageKey && !isInitialized) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored === "table" || stored === "grid") {
          setViewMode(stored)
        }
      } catch (error) {
        console.error("Failed to read view preference from localStorage:", error)
      }
      setIsInitialized(true)
    }
  }, [storageKey, isInitialized])

  // Save to localStorage when changed
  const handleSetViewMode = React.useCallback(
    (value: ViewMode) => {
      setViewMode(value)
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, value)
        } catch (error) {
          console.error("Failed to save view preference to localStorage:", error)
        }
      }
    },
    [storageKey]
  )

  return [viewMode, handleSetViewMode]
}
