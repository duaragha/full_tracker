'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  FileJson,
  Table2,
  Download,
  Loader2,
  CheckCircle,
  Eye,
  AlertCircle
} from 'lucide-react'

interface Highlight {
  id: number
  text: string
  note?: string
  source?: {
    title: string
    author?: string
    sourceType: string
  }
  tags?: Array<{ id: number; name: string }>
  highlightedAt: string
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  highlights: Highlight[]
  onExport?: (format: string, highlights: Highlight[]) => Promise<void>
}

type ExportFormat = 'markdown' | 'json' | 'csv' | 'onenote'
type ExportStatus = 'idle' | 'previewing' | 'exporting' | 'success' | 'error'

export function ExportDialog({ open, onOpenChange, highlights, onExport }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown')
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState<'select' | 'preview'>('select')

  const formatOptions = [
    {
      value: 'markdown',
      label: 'Markdown',
      icon: FileText,
      description: 'Perfect for Obsidian, Notion, and other note-taking apps'
    },
    {
      value: 'json',
      label: 'JSON',
      icon: FileJson,
      description: 'Structured data format for custom integrations'
    },
    {
      value: 'csv',
      label: 'CSV',
      icon: Table2,
      description: 'Spreadsheet format for Excel, Google Sheets'
    },
    {
      value: 'onenote',
      label: 'OneNote',
      icon: FileText,
      description: 'Export directly to Microsoft OneNote'
    }
  ]

  const generatePreview = (format: ExportFormat, items: Highlight[]) => {
    const sample = items.slice(0, 3)

    switch (format) {
      case 'markdown':
        return sample.map(h => `## ${h.source?.title || 'Unknown Source'}

**Author:** ${h.source?.author || 'Unknown'}

> ${h.text}

${h.note ? `**Note:** ${h.note}\n` : ''}
**Date:** ${new Date(h.highlightedAt).toLocaleDateString()}
${h.tags?.length ? `**Tags:** ${h.tags.map(t => `#${t.name}`).join(', ')}` : ''}

---
`).join('\n')

      case 'json':
        return JSON.stringify(sample.map(h => ({
          id: h.id,
          text: h.text,
          note: h.note,
          source: h.source,
          tags: h.tags?.map(t => t.name),
          highlightedAt: h.highlightedAt
        })), null, 2)

      case 'csv':
        const header = 'ID,Text,Note,Source Title,Author,Source Type,Tags,Date\n'
        const rows = sample.map(h =>
          `${h.id},"${h.text.replace(/"/g, '""')}","${h.note?.replace(/"/g, '""') || ''}","${h.source?.title || ''}","${h.source?.author || ''}","${h.source?.sourceType || ''}","${h.tags?.map(t => t.name).join('; ') || ''}","${new Date(h.highlightedAt).toLocaleDateString()}"`
        ).join('\n')
        return header + rows

      case 'onenote':
        return `OneNote Export Preview\n\n${sample.map(h =>
          `${h.source?.title || 'Unknown Source'}\n${h.text}\n${h.note ? `Note: ${h.note}\n` : ''}\n`
        ).join('\n---\n\n')}`

      default:
        return 'Preview not available'
    }
  }

  const handleExport = async () => {
    setStatus('exporting')
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      if (onExport) {
        await onExport(selectedFormat, highlights)
      } else {
        // Default export behavior - download file
        await new Promise(resolve => setTimeout(resolve, 2000))
        const content = generateFullExport(selectedFormat, highlights)
        downloadFile(content, selectedFormat)
      }

      clearInterval(progressInterval)
      setProgress(100)
      setStatus('success')

      // Close dialog after brief delay
      setTimeout(() => {
        onOpenChange(false)
        // Reset state
        setTimeout(() => {
          setStatus('idle')
          setProgress(0)
          setActiveTab('select')
        }, 300)
      }, 1500)
    } catch (error) {
      clearInterval(progressInterval)
      setStatus('error')
      console.error('Export failed:', error)
    }
  }

  const generateFullExport = (format: ExportFormat, items: Highlight[]): string => {
    switch (format) {
      case 'markdown':
        return `# Highlights Export\n\nExported on ${new Date().toLocaleDateString()}\n\n${items.map(h => `## ${h.source?.title || 'Unknown Source'}

**Author:** ${h.source?.author || 'Unknown'}

> ${h.text}

${h.note ? `**Note:** ${h.note}\n` : ''}
**Date:** ${new Date(h.highlightedAt).toLocaleDateString()}
${h.tags?.length ? `**Tags:** ${h.tags.map(t => `#${t.name}`).join(', ')}` : ''}

---
`).join('\n')}`

      case 'json':
        return JSON.stringify({
          exportedAt: new Date().toISOString(),
          count: items.length,
          highlights: items.map(h => ({
            id: h.id,
            text: h.text,
            note: h.note,
            source: h.source,
            tags: h.tags?.map(t => t.name),
            highlightedAt: h.highlightedAt
          }))
        }, null, 2)

      case 'csv':
        const header = 'ID,Text,Note,Source Title,Author,Source Type,Tags,Date\n'
        const rows = items.map(h =>
          `${h.id},"${h.text.replace(/"/g, '""')}","${h.note?.replace(/"/g, '""') || ''}","${h.source?.title || ''}","${h.source?.author || ''}","${h.source?.sourceType || ''}","${h.tags?.map(t => t.name).join('; ') || ''}","${new Date(h.highlightedAt).toLocaleDateString()}"`
        ).join('\n')
        return header + rows

      default:
        return JSON.stringify(items)
    }
  }

  const downloadFile = (content: string, format: ExportFormat) => {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `highlights-export-${timestamp}.${format === 'markdown' ? 'md' : format}`
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

  const handlePreview = () => {
    setStatus('previewing')
    setActiveTab('preview')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Export Highlights</DialogTitle>
          <DialogDescription>
            Export {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} in your preferred format
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">
              <Download className="mr-2 h-4 w-4" />
              Select Format
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Choose Export Format</Label>
              <RadioGroup value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ExportFormat)}>
                {formatOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label
                        htmlFor={option.value}
                        className="flex items-start gap-3 flex-1 cursor-pointer rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <Icon className="h-5 w-5 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Export Summary</span>
                <Badge variant="secondary">{highlights.length} items</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Selected highlights will be exported to {selectedFormat.toUpperCase()} format.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Export Preview</Label>
                <Badge variant="outline">First 3 of {highlights.length}</Badge>
              </div>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {generatePreview(selectedFormat, highlights)}
                </pre>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                This is a preview of how your export will look. The full export will include all {highlights.length} highlights.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Progress Section */}
        {status === 'exporting' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Exporting highlights...</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Success Message */}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Export completed successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Export failed. Please try again.</span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === 'exporting'}
          >
            Cancel
          </Button>
          {activeTab === 'select' && (
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={status === 'exporting'}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          )}
          <Button
            onClick={handleExport}
            disabled={status === 'exporting' || status === 'success'}
          >
            {status === 'exporting' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Completed
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
