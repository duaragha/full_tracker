'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createHighlightAction } from '@/app/actions/highlights'
import { TextSelection } from '@/lib/reader/selection-manager'
import { CreateHighlightDTO } from '@/types/highlight'

interface HighlightPopoverProps {
  selection: TextSelection
  sourceId: number
  onClose: () => void
  onHighlightCreated: (id: number) => void
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60' },
  { name: 'Green', value: 'green', class: 'bg-green-200 hover:bg-green-300 dark:bg-green-900/40 dark:hover:bg-green-900/60' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-200 hover:bg-blue-300 dark:bg-blue-900/40 dark:hover:bg-blue-900/60' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-200 hover:bg-pink-300 dark:bg-pink-900/40 dark:hover:bg-pink-900/60' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-200 hover:bg-purple-300 dark:bg-purple-900/40 dark:hover:bg-purple-900/60' },
] as const

export function HighlightPopover({
  selection,
  sourceId,
  onClose,
  onHighlightCreated,
}: HighlightPopoverProps) {
  const [selectedColor, setSelectedColor] = useState<string>('yellow')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateHighlight = async () => {
    if (!selection.text || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const highlightData: CreateHighlightDTO = {
        sourceId,
        text: selection.text,
        note: note.trim() || undefined,
        locationStart: selection.startOffset,
        locationEnd: selection.endOffset,
        color: selectedColor,
        highlightedAt: new Date().toISOString(),
      }

      const result = await createHighlightAction(highlightData)

      if (result && result.id) {
        onHighlightCreated(result.id)
        onClose()
      } else {
        setError('Failed to create highlight')
      }
    } catch (err) {
      console.error('Error creating highlight:', err)
      setError(err instanceof Error ? err.message : 'Failed to create highlight')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate position above the selected text
  const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${selection.boundingRect.top - 10}px`,
    left: `${selection.boundingRect.left + selection.boundingRect.width / 2}px`,
    transform: 'translate(-50%, -100%)',
    zIndex: 50,
  }

  return (
    <>
      {/* Backdrop to detect clicks outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ backgroundColor: 'transparent' }}
      />

      {/* Popover content */}
      <div
        style={popoverStyle}
        className="bg-popover text-popover-foreground border shadow-lg rounded-lg p-4 w-80 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Selected text preview */}
        <div className="mb-3 max-h-20 overflow-y-auto text-sm text-muted-foreground border-l-2 border-muted pl-2">
          {selection.text}
        </div>

        {/* Color picker */}
        <div className="mb-3">
          <label className="text-xs font-medium mb-2 block">Highlight Color</label>
          <div className="flex gap-2">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setSelectedColor(color.value)}
                className={`relative w-10 h-10 rounded-md border-2 transition-all ${
                  color.class
                } ${
                  selectedColor === color.value
                    ? 'border-primary ring-2 ring-ring ring-offset-2 ring-offset-background'
                    : 'border-transparent hover:border-muted-foreground/50'
                }`}
                title={color.name}
                disabled={isLoading}
              >
                {selectedColor === color.value && (
                  <Check className="absolute inset-0 m-auto size-4 text-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Note textarea */}
        <div className="mb-3">
          <label htmlFor="highlight-note" className="text-xs font-medium mb-1.5 block">
            Note (optional)
          </label>
          <Textarea
            id="highlight-note"
            placeholder="Add your thoughts..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-20 resize-none text-sm"
            disabled={isLoading}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleCreateHighlight}
            disabled={isLoading}
            className="flex-1"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              'Highlight'
            )}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isLoading}
            size="sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  )
}
