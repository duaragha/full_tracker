'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

interface HighlightSearchProps {
  placeholder?: string
  initialQuery?: string
  initialSort?: string
}

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'relevance', label: 'Most relevant' },
  { value: 'source_asc', label: 'Source A-Z' },
  { value: 'source_desc', label: 'Source Z-A' },
]

export function HighlightSearch({
  placeholder = 'Search highlights by text, notes, source, or author...',
  initialQuery = '',
  initialSort = 'date_desc',
}: HighlightSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [query, setQuery] = useState(initialQuery)
  const [sort, setSort] = useState(initialSort)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateUrl()
  }

  const updateUrl = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (query.trim()) {
      params.set('query', query.trim())
    } else {
      params.delete('query')
    }

    if (sort !== 'date_desc') {
      params.set('sort', sort)
    } else {
      params.delete('sort')
    }

    startTransition(() => {
      router.push(`/highlights?${params.toString()}`)
    })
  }

  const handleClear = () => {
    setQuery('')
    setSort('date_desc')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('query')
    params.delete('sort')
    startTransition(() => {
      router.push(`/highlights?${params.toString()}`)
    })
  }

  const handleSortChange = (value: string) => {
    setSort(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value !== 'date_desc') {
      params.set('sort', value)
    } else {
      params.delete('sort')
    }
    startTransition(() => {
      router.push(`/highlights?${params.toString()}`)
    })
  }

  return (
    <div className="flex gap-2">
      <form onSubmit={handleSearch} className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-9"
            disabled={isPending}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </form>

      <Select value={sort} onValueChange={handleSortChange} disabled={isPending}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
