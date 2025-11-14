'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TOCItem, findActiveTOCItem, flattenTOC } from '@/lib/reader/toc-extractor'
import { cn } from '@/lib/utils'

interface TableOfContentsProps {
  items: TOCItem[]
  className?: string
}

interface TOCItemComponentProps {
  item: TOCItem
  activeId: string | null
  onItemClick: (id: string) => void
  level?: number
}

/**
 * Recursive component to render a single TOC item with its children
 */
function TOCItemComponent({ item, activeId, onItemClick, level = 0 }: TOCItemComponentProps) {
  const [isOpen, setIsOpen] = useState(true)
  const hasChildren = item.children && item.children.length > 0
  const isActive = activeId === item.id

  // Auto-expand if this item or any child is active
  useEffect(() => {
    if (hasChildren && item.children) {
      const hasActiveChild = item.children.some((child) => {
        const checkActive = (item: TOCItem): boolean => {
          if (item.id === activeId) return true
          return item.children?.some(checkActive) || false
        }
        return checkActive(child)
      })

      if (hasActiveChild) {
        setIsOpen(true)
      }
    }
  }, [activeId, hasChildren, item.children])

  const handleClick = () => {
    onItemClick(item.id)
  }

  const indentClass = cn(
    'pl-0',
    level === 1 && 'pl-4',
    level === 2 && 'pl-8',
    level >= 3 && 'pl-12'
  )

  return (
    <div className={indentClass}>
      {hasChildren ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-start gap-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 shrink-0 mt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <button
              onClick={handleClick}
              className={cn(
                'flex-1 text-left py-1.5 px-2 rounded text-sm transition-colors hover:bg-accent',
                isActive && 'bg-accent font-medium text-accent-foreground',
                !isActive && 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.text}
            </button>
          </div>
          <CollapsibleContent className="mt-1">
            {item.children?.map((child) => (
              <TOCItemComponent
                key={child.id}
                item={child}
                activeId={activeId}
                onItemClick={onItemClick}
                level={level + 1}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <button
          onClick={handleClick}
          className={cn(
            'w-full text-left py-1.5 px-2 rounded text-sm transition-colors hover:bg-accent',
            isActive && 'bg-accent font-medium text-accent-foreground',
            !isActive && 'text-muted-foreground hover:text-foreground'
          )}
        >
          {item.text}
        </button>
      )}
    </div>
  )
}

/**
 * Table of Contents Component
 *
 * Displays a hierarchical, navigable table of contents for an article
 *
 * Features:
 * - Nested TOC with collapsible sections
 * - Highlights current section based on scroll position
 * - Smooth scrolling to sections on click
 * - Responsive (toggleable sidebar on mobile)
 */
export function TableOfContents({ items, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Update active section based on scroll position
   */
  const updateActiveSection = useCallback(() => {
    const flatItems = flattenTOC(items)
    const newActiveId = findActiveTOCItem(flatItems, 100)
    setActiveId(newActiveId)
  }, [items])

  /**
   * Handle scroll events (debounced)
   */
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      updateActiveSection()
    }, 100)
  }, [updateActiveSection])

  /**
   * Scroll to a heading when clicked
   */
  const handleItemClick = useCallback((id: string) => {
    const element = document.getElementById(id)
    if (element) {
      // Calculate offset for better positioning (account for fixed headers, etc.)
      const offset = 80
      const elementPosition = element.offsetTop
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })

      // Close mobile menu after click
      setIsOpen(false)
    }
  }, [])

  /**
   * Setup scroll listener
   */
  useEffect(() => {
    // Initial active section detection
    updateActiveSection()

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll, updateActiveSection])

  // Don't render if no items
  if (items.length === 0) {
    return null
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* TOC Sidebar */}
      <aside
        className={cn(
          'fixed top-20 right-0 h-[calc(100vh-5rem)] w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300 z-40',
          // Mobile: slide in from right
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          className
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Contents
            </h2>
          </div>

          {/* TOC Items */}
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-1">
              {items.map((item) => (
                <TOCItemComponent
                  key={item.id}
                  item={item}
                  activeId={activeId}
                  onItemClick={handleItemClick}
                  level={0}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
