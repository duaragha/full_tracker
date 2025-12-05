'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { searchLocationsAction, LocationSuggestion } from '@/lib/actions/location'

interface LocationAutocompleteProps {
  value: string
  onChange: (location: string) => void
  onSelect: (suggestion: LocationSuggestion) => void
  placeholder?: string
  className?: string
  inputClassName?: string
}

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search location...',
  className,
  inputClassName,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const results = await searchLocationsAction(value)
        setSuggestions(results)
        setIsOpen(results.length > 0)
        setHighlightedIndex(-1)
      } catch (error) {
        console.error('Location search error:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [value])

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((suggestion: LocationSuggestion) => {
    // Use the full display name (e.g., "8 Legacy Lane, Brampton, ON L6X 5C1")
    onChange(suggestion.displayName)
    onSelect(suggestion)
    setIsOpen(false)
    setSuggestions([])
    setHighlightedIndex(-1)
  }, [onChange, onSelect])

  const handleClear = useCallback(() => {
    onChange('')
    setSuggestions([])
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }, [isOpen, suggestions, highlightedIndex, handleSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }, [onChange])

  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setIsOpen(true)
    }
  }, [suggestions.length])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input with icons */}
      <div className="relative">
        <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn('pl-8 pr-8 h-8 text-sm', inputClassName)}
          autoComplete="off"
        />
        {/* Loading indicator */}
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {/* Clear button */}
        {value && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors',
                highlightedIndex === index
                  ? 'bg-muted'
                  : 'hover:bg-muted/50'
              )}
            >
              <div className="font-medium truncate">{suggestion.name}</div>
              {suggestion.subtitle && (
                <div className="text-xs text-muted-foreground truncate">
                  {suggestion.subtitle}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
