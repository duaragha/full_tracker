'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ArrowLeft,
  Download,
  FileJson,
  FileText,
  Table2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Filter,
  Tag,
  BookMarked,
  Globe,
  FileType
} from 'lucide-react'
import Link from 'next/link'
import { DatePicker } from '@/components/ui/date-picker'

interface ExportFilters {
  dateFrom?: Date
  dateTo?: Date
  sourceType?: string
  sources?: number[]
  tags?: string[]
}

interface ExportHistoryItem {
  id: number
  format: string
  date: Date
  count: number
  status: 'success' | 'failed'
}

export default function ExportPage() {
  const [isConnectedToOneNote, setIsConnectedToOneNote] = useState(false)
  const [selectedNotebook, setSelectedNotebook] = useState<string>('')
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)
  const [lastExport, setLastExport] = useState<{ count: number; hours: number } | null>(null)
  const [filters, setFilters] = useState<ExportFilters>({})
  const [exportHistory] = useState<ExportHistoryItem[]>([
    { id: 1, format: 'Markdown', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), count: 45, status: 'success' },
    { id: 2, format: 'JSON', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), count: 45, status: 'success' },
    { id: 3, format: 'OneNote', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), count: 30, status: 'success' },
  ])

  const handleConnectOneNote = async () => {
    // OAuth flow would be implemented here
    setIsConnectedToOneNote(true)
    // Simulate getting notebooks
    setSelectedNotebook('Personal Notes')
    setSelectedSection('Reading Highlights')
  }

  const handleExportToOneNote = async () => {
    setExportingFormat('onenote')
    // Simulate export
    setTimeout(() => {
      setExportingFormat(null)
      setLastExport({ count: 12, hours: 0 })
    }, 2000)
  }

  const handleQuickExport = async (format: 'markdown' | 'json' | 'csv') => {
    setExportingFormat(format)

    // Simulate export with download
    setTimeout(() => {
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `highlights-export-${timestamp}.${format}`

      // Create download link
      const element = document.createElement('a')
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent('Export content here'))
      element.setAttribute('download', filename)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      setExportingFormat(null)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/highlights">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Highlights
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Export Highlights</h1>
        <p className="text-muted-foreground mt-1">
          Export your highlights to various formats and destinations
        </p>
      </div>

      {/* OneNote Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            OneNote Integration
          </CardTitle>
          <CardDescription>
            Sync your highlights to Microsoft OneNote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnectedToOneNote ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connect to OneNote</AlertTitle>
                <AlertDescription>
                  Connect your Microsoft account to start exporting highlights to OneNote
                </AlertDescription>
              </Alert>
              <Button onClick={handleConnectOneNote} className="w-full sm:w-auto">
                Connect to OneNote
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Connected to OneNote</AlertTitle>
                <AlertDescription>
                  Your Microsoft account is connected and ready to sync
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="notebook">Notebook</Label>
                  <Select value={selectedNotebook} onValueChange={setSelectedNotebook}>
                    <SelectTrigger id="notebook">
                      <SelectValue placeholder="Select notebook" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Personal Notes">Personal Notes</SelectItem>
                      <SelectItem value="Work Notes">Work Notes</SelectItem>
                      <SelectItem value="Reading">Reading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger id="section">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Reading Highlights">Reading Highlights</SelectItem>
                      <SelectItem value="Book Notes">Book Notes</SelectItem>
                      <SelectItem value="Articles">Articles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportToOneNote}
                  disabled={!selectedNotebook || !selectedSection || exportingFormat === 'onenote'}
                >
                  {exportingFormat === 'onenote' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export to OneNote
                    </>
                  )}
                </Button>
              </div>

              {lastExport && (
                <div className="text-sm text-muted-foreground">
                  Last exported {lastExport.count} highlights {lastExport.hours === 0 ? 'just now' : `${lastExport.hours} hours ago`}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Exports Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Exports</CardTitle>
          <CardDescription>
            Download your highlights in various formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={() => handleQuickExport('markdown')}
              disabled={exportingFormat === 'markdown'}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5" />
                <span className="font-semibold">Markdown</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {exportingFormat === 'markdown' ? 'Exporting...' : 'Perfect for note-taking apps'}
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={() => handleQuickExport('json')}
              disabled={exportingFormat === 'json'}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="h-5 w-5" />
                <span className="font-semibold">JSON</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {exportingFormat === 'json' ? 'Exporting...' : 'Structured data format'}
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={() => handleQuickExport('csv')}
              disabled={exportingFormat === 'csv'}
            >
              <div className="flex items-center gap-2 mb-2">
                <Table2 className="h-5 w-5" />
                <span className="font-semibold">CSV</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {exportingFormat === 'csv' ? 'Exporting...' : 'Spreadsheet compatible'}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Export Filters
          </CardTitle>
          <CardDescription>
            Filter which highlights to include in exports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date-from" className="text-sm text-muted-foreground">
                  From
                </Label>
                <DatePicker
                  date={filters.dateFrom}
                  onDateChange={(date) => setFilters({ ...filters, dateFrom: date || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to" className="text-sm text-muted-foreground">
                  To
                </Label>
                <DatePicker
                  date={filters.dateTo}
                  onDateChange={(date) => setFilters({ ...filters, dateTo: date || undefined })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Source Type Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <FileType className="h-4 w-4" />
              Source Type
            </Label>
            <Select
              value={filters.sourceType}
              onValueChange={(value) => setFilters({ ...filters, sourceType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All source types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="kindle">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4" />
                    Kindle Books
                  </div>
                </SelectItem>
                <SelectItem value="web_article">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Web Articles
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDFs
                  </div>
                </SelectItem>
                <SelectItem value="book">Books</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Tags Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            <Input
              placeholder="Filter by tags (comma-separated)"
              onChange={(e) => {
                const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                setFilters({ ...filters, tags: tags.length > 0 ? tags : undefined })
              }}
            />
            <p className="text-xs text-muted-foreground">
              Enter tags separated by commas, e.g., "important, productivity, learning"
            </p>
          </div>

          {/* Active Filters Display */}
          {(filters.dateFrom || filters.dateTo || filters.sourceType || (filters.tags && filters.tags.length > 0)) && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm">Active Filters</Label>
                <div className="flex flex-wrap gap-2">
                  {filters.dateFrom && (
                    <Badge variant="secondary">
                      From: {filters.dateFrom.toLocaleDateString()}
                    </Badge>
                  )}
                  {filters.dateTo && (
                    <Badge variant="secondary">
                      To: {filters.dateTo.toLocaleDateString()}
                    </Badge>
                  )}
                  {filters.sourceType && filters.sourceType !== 'all' && (
                    <Badge variant="secondary">
                      Type: {filters.sourceType}
                    </Badge>
                  )}
                  {filters.tags && filters.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      Tag: {tag}
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({})}
                    className="h-6 px-2 text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            Recent exports and downloads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exportHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    item.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium">{item.format} Export</p>
                    <p className="text-sm text-muted-foreground">
                      {item.count} highlights • {item.date.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
