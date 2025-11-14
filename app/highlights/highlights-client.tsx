'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ExportDialog } from '@/components/export-dialog'
import { Download, FileText, FileJson, Table2, ChevronDown, ChevronRight } from 'lucide-react'

interface Highlight {
  id: number
  text: string
  note?: string | null
  source?: {
    id: number
    title: string
    author?: string | null
    sourceType: string
  } | null
  tags?: Array<{ id: number; name: string }> | null
  highlightedAt: string
}

interface HighlightsClientProps {
  highlights: Highlight[]
}

export function HighlightsClient({ highlights }: HighlightsClientProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set())

  // Group highlights by source
  const groupedHighlights = highlights.reduce((acc, highlight) => {
    const sourceId = highlight.source?.id || 0
    if (!acc[sourceId]) {
      acc[sourceId] = {
        source: highlight.source,
        highlights: []
      }
    }
    acc[sourceId].highlights.push(highlight)
    return acc
  }, {} as Record<number, { source: Highlight['source'], highlights: Highlight[] }>)

  const toggleSelectAll = () => {
    if (selectedIds.size === highlights.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(highlights.map(h => h.id)))
    }
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectSource = (sourceHighlights: Highlight[]) => {
    const sourceIds = sourceHighlights.map(h => h.id)
    const allSelected = sourceIds.every(id => selectedIds.has(id))

    const newSelected = new Set(selectedIds)
    if (allSelected) {
      sourceIds.forEach(id => newSelected.delete(id))
    } else {
      sourceIds.forEach(id => newSelected.add(id))
    }
    setSelectedIds(newSelected)
  }

  const toggleExpandSource = (sourceId: number) => {
    const newExpanded = new Set(expandedSources)
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId)
    } else {
      newExpanded.add(sourceId)
    }
    setExpandedSources(newExpanded)
  }

  const getSelectedHighlights = () => {
    return highlights.filter(h => selectedIds.has(h.id))
  }

  const handleQuickExport = async (format: 'markdown' | 'json' | 'csv') => {
    const selected = getSelectedHighlights()
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `highlights-export-${timestamp}.${format}`

    let content = ''

    switch (format) {
      case 'markdown':
        content = `# Highlights Export\n\nExported on ${new Date().toLocaleDateString()}\n\n${selected.map(h => `## ${h.source?.title || 'Unknown Source'}

**Author:** ${h.source?.author || 'Unknown'}

> ${h.text}

${h.note ? `**Note:** ${h.note}\n` : ''}
**Date:** ${new Date(h.highlightedAt).toLocaleDateString()}
${h.tags?.length ? `**Tags:** ${h.tags.map(t => `#${t.name}`).join(', ')}` : ''}

---
`).join('\n')}`
        break

      case 'json':
        content = JSON.stringify({
          exportedAt: new Date().toISOString(),
          count: selected.length,
          highlights: selected.map(h => ({
            id: h.id,
            text: h.text,
            note: h.note,
            source: h.source,
            tags: h.tags?.map(t => t.name),
            highlightedAt: h.highlightedAt
          }))
        }, null, 2)
        break

      case 'csv':
        const header = 'ID,Text,Note,Source Title,Author,Source Type,Tags,Date\n'
        const rows = selected.map(h =>
          `${h.id},"${h.text.replace(/"/g, '""')}","${h.note?.replace(/"/g, '""') || ''}","${h.source?.title || ''}","${h.source?.author || ''}","${h.source?.sourceType || ''}","${h.tags?.map(t => t.name).join('; ') || ''}","${new Date(h.highlightedAt).toLocaleDateString()}"`
        ).join('\n')
        content = header + rows
        break
    }

    // Download the file
    const mimeType = format === 'json' ? 'application/json' : 'text/plain'
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const element = document.createElement('a')
    element.href = url
    element.download = filename
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="mb-4 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.size === highlights.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="font-medium">
                  {selectedIds.size} highlight{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear Selection
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Quick Export
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleQuickExport('markdown')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickExport('json')}>
                      <FileJson className="mr-2 h-4 w-4" />
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
                      <Table2 className="mr-2 h-4 w-4" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button size="sm" onClick={() => setShowExportDialog(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped Highlights List */}
      <div className="grid gap-4">
        {highlights.length > 0 && selectedIds.size === 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              Select All
            </Button>
          </div>
        )}

        {Object.entries(groupedHighlights).map(([sourceId, { source, highlights: sourceHighlights }]) => {
          const isExpanded = expandedSources.has(Number(sourceId))
          const sourceSelectedCount = sourceHighlights.filter(h => selectedIds.has(h.id)).length
          const allSourceSelected = sourceSelectedCount === sourceHighlights.length

          return (
            <Card
              key={sourceId}
              className={`hover:shadow-md transition-shadow ${
                sourceSelectedCount > 0 ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={allSourceSelected}
                    onCheckedChange={() => toggleSelectSource(sourceHighlights)}
                    className="mt-1"
                  />
                  <div className="flex items-start justify-between flex-1">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {source?.title || 'Unknown Source'}
                      </CardTitle>
                      {source?.author && (
                        <CardDescription className="mt-1">
                          by {source.author}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {source?.sourceType || 'Unknown'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {sourceHighlights.length} highlight{sourceHighlights.length !== 1 ? 's' : ''}
                        </span>
                        {sourceSelectedCount > 0 && (
                          <span className="text-sm text-primary font-medium">
                            ({sourceSelectedCount} selected)
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpandSource(Number(sourceId))}
                      className="ml-2"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-3 ml-9">
                    {sourceHighlights.map((highlight) => (
                      <div
                        key={highlight.id}
                        className={`p-3 rounded-lg border ${
                          selectedIds.has(highlight.id) ? 'border-primary bg-primary/5' : 'border-muted'
                        } hover:border-primary/50 transition-colors`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedIds.has(highlight.id)}
                            onCheckedChange={() => toggleSelect(highlight.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <p className="text-sm leading-relaxed">{highlight.text}</p>
                            {highlight.note && (
                              <p className="text-sm text-muted-foreground italic">
                                Note: {highlight.note}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                {highlight.tags && highlight.tags.length > 0 && (
                                  <div className="flex gap-1">
                                    {highlight.tags.map((tag) => (
                                      <Badge key={tag.id} variant="secondary" className="text-xs">
                                        {tag.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <time>
                                {new Date(highlight.highlightedAt).toLocaleDateString()}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        highlights={getSelectedHighlights()}
      />
    </>
  )
}
