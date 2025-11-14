'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, BookOpen, FileText, Globe, Upload, CheckCircle, AlertCircle, Loader2, Cloud } from 'lucide-react'
import Link from 'next/link'
import { importKindleAction, importKindleHTMLAction, KindleImportStats } from '@/app/actions/highlights'
import { WebArticleImport } from './web-article-import'
import { ManualHighlightForm } from './manual-form'

export default function ImportPage() {
  // Kindle import state
  const [kindleFile, setKindleFile] = useState<File | null>(null)
  const [kindleImporting, setKindleImporting] = useState(false)
  const [kindleStats, setKindleStats] = useState<KindleImportStats | null>(null)
  const [kindleError, setKindleError] = useState<string | null>(null)

  const handleKindleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setKindleFile(file)
      setKindleStats(null)
      setKindleError(null)
    }
  }

  const handleKindleImport = async () => {
    if (!kindleFile) return

    setKindleImporting(true)
    setKindleError(null)
    setKindleStats(null)

    try {
      // Read file content
      const content = await kindleFile.text()

      // Detect file type and call appropriate import action
      const isHTML = kindleFile.name.toLowerCase().endsWith('.html')
      const stats = isHTML
        ? await importKindleHTMLAction(content)
        : await importKindleAction(content)

      setKindleStats(stats)
    } catch (error) {
      setKindleError(error instanceof Error ? error.message : 'Failed to import Kindle highlights')
    } finally {
      setKindleImporting(false)
    }
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/highlights">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Highlights
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/highlights/sync">
              <Cloud className="mr-2 h-4 w-4" />
              Auto-Sync from Kindle
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Import Highlights</h1>
        <p className="text-muted-foreground mt-1">
          Add highlights from various sources
        </p>
      </div>

      {/* Import Methods */}
      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="kindle">Kindle</TabsTrigger>
          <TabsTrigger value="web">Web Article</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
        </TabsList>

        {/* Manual Entry */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Add Highlight Manually</CardTitle>
              <CardDescription>
                Enter a highlight from a book, article, or any other source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManualHighlightForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kindle Import */}
        <TabsContent value="kindle">
          <Card>
            <CardHeader>
              <CardTitle>Import from Kindle</CardTitle>
              <CardDescription>
                Upload your Kindle's "My Clippings.txt" file or HTML notebook export to import all your highlights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Upload Kindle File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {kindleFile ? (
                    <span className="font-medium text-foreground">{kindleFile.name}</span>
                  ) : (
                    'Upload "My Clippings.txt" or HTML notebook export from Kindle app'
                  )}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" asChild disabled={kindleImporting}>
                    <label htmlFor="kindle-file-input" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Choose File
                    </label>
                  </Button>
                  {kindleFile && (
                    <Button
                      onClick={handleKindleImport}
                      disabled={kindleImporting}
                    >
                      {kindleImporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Start Import'
                      )}
                    </Button>
                  )}
                </div>
                <input
                  id="kindle-file-input"
                  type="file"
                  accept=".txt,.html"
                  className="hidden"
                  onChange={handleKindleFileChange}
                  disabled={kindleImporting}
                />
              </div>

              {/* Progress Indicator */}
              {kindleImporting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Processing your Kindle highlights...</span>
                  </div>
                  <Progress value={undefined} className="w-full" />
                </div>
              )}

              {/* Error Display */}
              {kindleError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Import Failed</AlertTitle>
                  <AlertDescription>{kindleError}</AlertDescription>
                </Alert>
              )}

              {/* Success Display */}
              {kindleStats && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Import Successful!</AlertTitle>
                    <AlertDescription>
                      Your Kindle highlights have been imported successfully.
                    </AlertDescription>
                  </Alert>

                  {/* Statistics */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Highlights Imported</CardDescription>
                        <CardTitle className="text-3xl">{kindleStats.highlightsImported}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Books Found</CardDescription>
                        <CardTitle className="text-3xl">{kindleStats.sourcesCreated}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Duplicates Skipped</CardDescription>
                        <CardTitle className="text-3xl">{kindleStats.duplicatesSkipped}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardDescription>Total Processed</CardDescription>
                        <CardTitle className="text-3xl">{kindleStats.totalHighlights}</CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Books List */}
                  {kindleStats.books.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Imported Books</h4>
                      <div className="space-y-2">
                        {kindleStats.books.map((book, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{book.title}</p>
                              {book.author && (
                                <p className="text-sm text-muted-foreground">{book.author}</p>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {book.highlightCount} highlight{book.highlightCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors List */}
                  {kindleStats.errors.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 text-destructive">
                        Errors ({kindleStats.errors.length})
                      </h4>
                      <div className="space-y-2">
                        {kindleStats.errors.slice(0, 5).map((error, idx) => (
                          <Alert key={idx} variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Line {error.line}</AlertTitle>
                            <AlertDescription>
                              {error.message}
                              {error.context && (
                                <pre className="mt-2 text-xs overflow-x-auto">{error.context}</pre>
                              )}
                            </AlertDescription>
                          </Alert>
                        ))}
                        {kindleStats.errors.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            And {kindleStats.errors.length - 5} more errors...
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button asChild>
                      <Link href="/highlights">View All Highlights</Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setKindleFile(null)
                        setKindleStats(null)
                        setKindleError(null)
                      }}
                    >
                      Import Another File
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              {!kindleStats && !kindleImporting && (
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Option 1: Kindle Desktop App (Recommended for sideloaded books)</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Open Kindle Desktop App and open your book</li>
                      <li>Click the "Notebook" icon to view your highlights</li>
                      <li>Click "Export" and save the HTML file</li>
                      <li>Upload the HTML file here</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Option 2: My Clippings.txt (Older Kindle devices)</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Connect your Kindle to your computer via USB</li>
                      <li>Open the Kindle drive and navigate to "documents" folder</li>
                      <li>Find "My Clippings.txt" and upload it here</li>
                    </ol>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Web Article */}
        <TabsContent value="web">
          <WebArticleImport />
        </TabsContent>

        {/* PDF Upload */}
        <TabsContent value="pdf">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>
                Upload a PDF to read and highlight
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Upload PDF Document</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop a PDF file here, or click to browse
                </p>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Choose PDF
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Supported files:</h4>
                <p className="text-sm text-muted-foreground">
                  PDF files up to 50MB. If your PDF already has highlights or annotations, we'll import them automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
