'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface TabItem {
  label: string
  href: string
}

const TABS: TabItem[] = [
  { label: 'Timeline', href: '/journal' },
  { label: 'Calendar', href: '/journal/calendar' },
  { label: 'Map', href: '/journal/map' },
  { label: 'Stats', href: '/journal/stats' },
]

interface JournalViewTabsProps {
  className?: string
}

export function JournalViewTabs({ className }: JournalViewTabsProps) {
  const pathname = usePathname()

  // Determine active tab based on pathname
  const getIsActive = (href: string) => {
    if (href === '/journal') {
      // Timeline is active when on /journal or /journal/ exactly
      return pathname === '/journal' || pathname === '/journal/'
    }
    // Other tabs match when pathname starts with their href
    return pathname.startsWith(href)
  }

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-muted rounded-lg w-fit', className)}>
      {TABS.map((tab) => {
        const isActive = getIsActive(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
