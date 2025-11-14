'use client'

import { useState, useRef, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Globe, Loader2, CheckCircle2, AlertCircle, ArrowLeft, BookOpen, ExternalLink, Upload, FileText, File } from 'lucide-react'
import { saveArticleAction } from '@/app/actions/highlights'
import { HighlightSource } from '@/types/highlight'
import Link from 'next/link'

type FetchState = 'idle' | 'loading' | 'success' | 'error'

interface ArticlePreview {
  source: HighlightSource
  wordCount: number
  readingTimeMinutes: number
}

interface FileUploadState {
  file: File | null
  uploading: boolean
  progress: number
  error: string | null
  errorDetails: string | null
  sourceId: number | null
}

export default function AddContentPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('url')

  // URL import state
  const [url, setUrl] = useState('')
  const [state, setState] = useState<FetchState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [preview, setPreview] = useState<ArticlePreview | null>(null)

  // File upload state
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    uploading: false,
    progress: 0,
    error: null,
    errorDetails: null,
    sourceId: null,
  })
  const [isDragging, setIsDragging] = useState(false)

  const validateUrl = (url: string): string | null => {
    if (!url.trim()) {
      return 'Please enter a URL'
    }

    try {
      const urlObj = new URL(url)
      if (!urlObj.protocol.startsWith('http')) {
        return 'URL must start with http:// or https://'
      }
      return null
    } catch {
      return 'Please enter a valid URL'
    }
  }

  const handleImportArticle = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateUrl(url)
    if (validationError) {
      setError(validationError)
      setState('error')
      return
    }

    // Reset state
    setError(null)
    setErrorDetails(null)
    setPreview(null)
    setState('loading')

    try {
      const result = await saveArticleAction(url.trim())

      if (!result.success) {
        setState('error')
        setError(result.error || 'Failed to fetch article')
        setErrorDetails(result.details || null)
      } else {
        setState('success')
        setPreview({
          source: result.source!,
          wordCount: result.wordCount!,
          readingTimeMinutes: result.readingTimeMinutes!
        })

        // Automatically redirect to reader after 1.5 seconds
        setTimeout(() => {
          router.push(`/highlights/read/${result.source!.id}`)
        }, 1500)
      }
    } catch (err) {
      setState('error')
      setError('An unexpected error occurred')
      setErrorDetails(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching article:', err)
    }
  }

  const handleReset = () => {
    setUrl('')
    setState('idle')
    setError(null)
    setErrorDetails(null)
    setPreview(null)
  }

  const handleStartReading = () => {
    if (preview?.source.id) {
      router.push(`/highlights/read/${preview.source.id}`)
    }
  }

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file: File) => {
    // Reset state
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      error: null,
      errorDetails: null,
      sourceId: null,
    })

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/epub+zip']
    if (!allowedTypes.includes(file.type)) {
      setUploadState(prev => ({
        ...prev,
        error: 'Invalid file type',
        errorDetails: 'Only PDF and EPUB files are supported',
      }))
      return
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadState(prev => ({
        ...prev,
        error: 'File too large',
        errorDetails: `Maximum file size is ${maxSize / 1024 / 1024}MB`,
      }))
      return
    }

    setUploadState(prev => ({ ...prev, file }))
  }

  const handleUploadFile = async () => {
    if (!uploadState.file) return

    setUploadState(prev => ({ ...prev, uploading: true, progress: 0, error: null }))

    try {
      const formData = new FormData()
      formData.append('file', uploadState.file)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }))
      }, 200)

      const response = await fetch('/api/reader/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      const result = await response.json()

      if (!result.success) {
        setUploadState(prev => ({
          ...prev,
          uploading: false,
          progress: 0,
          error: result.error || 'Upload failed',
          errorDetails: result.details || null,
        }))
        return
      }

      setUploadState(prev => ({
        ...prev,
        uploading: false,
        progress: 100,
        sourceId: result.sourceId,
      }))

      // Redirect to reader after 1.5 seconds
      setTimeout(() => {
        router.push(`/highlights/read/${result.sourceId}`)
      }, 1500)
    } catch (err) {
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        progress: 0,
        error: 'Upload failed',
        errorDetails: err instanceof Error ? err.message : 'Unknown error',
      }))
      console.error('Upload error:', err)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleResetUpload = () => {
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      error: null,
      errorDetails: null,
      sourceId: null,
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/highlights">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add Content</h1>
        <p className="text-muted-foreground mt-1">
          Import articles from the web or upload PDF/EPUB files to read and highlight
        </p>
      </div>

      {/* Main Card with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Add Content to Library</CardTitle>
          <CardDescription>
            Choose how you want to add content to your reading library
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">
                <Globe className="mr-2 h-4 w-4" />
                Import by URL
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </TabsTrigger>
            </TabsList>

            {/* URL Import Tab */}
            <TabsContent value="url" className="space-y-4">
          {/* URL Input Form */}
          {(state === 'idle' || state === 'loading') && (
            <form onSubmit={handleImportArticle} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="article-url">Article URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="article-url"
                      type="url"
                      placeholder="https://example.com/article"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={state === 'loading'}
                      required
                      className="pl-10"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={state === 'loading' || !url.trim()}
                    className="min-w-[140px]"
                  >
                    {state === 'loading' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      'Import Article'
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Must be a valid http:// or https:// URL
                </p>
              </div>

              {state === 'loading' && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>Fetching article...</AlertTitle>
                  <AlertDescription>
                    Please wait while we extract and parse the article content.
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">How it works:</h4>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Paste the URL of any web article</li>
                  <li>We'll extract the content and save it to your library</li>
                  <li>Start reading in a clean, distraction-free format</li>
                  <li>Create highlights by selecting text as you read</li>
                </ol>
              </div>
            </form>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error}</AlertTitle>
                {errorDetails && (
                  <AlertDescription>{errorDetails}</AlertDescription>
                )}
              </Alert>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Common Issues:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>The article may be behind a paywall</li>
                  <li>The URL may require authentication</li>
                  <li>The page may not contain article content</li>
                  <li>The site may be blocking automated requests</li>
                  <li>The URL format may be invalid</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleReset} variant="outline">
                  Try Another URL
                </Button>
              </div>
            </div>
          )}

          {/* Success State - Article Preview */}
          {state === 'success' && preview && (
            <div className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700 dark:text-green-400">
                  Article imported successfully!
                </AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-500">
                  Redirecting to reader...
                </AlertDescription>
              </Alert>

              {/* Article Preview Card */}
              <div className="border rounded-lg p-6 space-y-4 bg-card">
                <div>
                  <h3 className="font-semibold text-xl mb-2">{preview.source.title}</h3>
                  {preview.source.author && (
                    <p className="text-sm text-muted-foreground">by {preview.source.author}</p>
                  )}
                </div>

                {preview.source.excerpt && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {preview.source.excerpt}
                  </p>
                )}

                <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="font-medium">{preview.wordCount.toLocaleString()}</span>
                    <span>words</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{preview.readingTimeMinutes}</span>
                    <span>min read</span>
                  </div>
                  {preview.source.domain && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>{preview.source.domain}</span>
                    </div>
                  )}
                </div>

                {preview.source.url && (
                  <div className="pt-3 border-t">
                    <a
                      href={preview.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{preview.source.url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 pt-2">
                <Button onClick={handleReset} variant="outline">
                  Import Another Article
                </Button>
                <Button onClick={handleStartReading} size="lg">
                  Start Reading Now
                </Button>
              </div>
            </div>
          )}
            </TabsContent>

            {/* File Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              {/* File Upload Area */}
              {!uploadState.file && !uploadState.sourceId && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center transition-colors
                    ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                    ${uploadState.error ? 'border-destructive' : ''}
                  `}
                >
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className={`rounded-full p-4 ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-1">
                        {isDragging ? 'Drop file here' : 'Upload PDF or EPUB'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop your file here, or click to browse
                      </p>
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.epub,application/pdf,application/epub+zip"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Choose File
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Supported formats: PDF, EPUB</p>
                      <p>Maximum file size: 50MB</p>
                    </div>
                  </div>
                </div>
              )}

              {/* File Preview & Upload */}
              {uploadState.file && !uploadState.sourceId && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <File className="h-10 w-10 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{uploadState.file.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(uploadState.file.size)} • {uploadState.file.type.includes('pdf') ? 'PDF' : 'EPUB'}
                        </p>
                      </div>
                    </div>

                    {uploadState.uploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Uploading and processing...</span>
                          <span className="font-medium">{uploadState.progress}%</span>
                        </div>
                        <Progress value={uploadState.progress} />
                      </div>
                    )}
                  </div>

                  {!uploadState.uploading && (
                    <div className="flex justify-between gap-3">
                      <Button onClick={handleResetUpload} variant="outline">
                        Choose Different File
                      </Button>
                      <Button onClick={handleUploadFile} size="lg">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload and Process
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Error */}
              {uploadState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{uploadState.error}</AlertTitle>
                  {uploadState.errorDetails && (
                    <AlertDescription>{uploadState.errorDetails}</AlertDescription>
                  )}
                </Alert>
              )}

              {/* Upload Success */}
              {uploadState.sourceId && (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-700 dark:text-green-400">
                      File uploaded successfully!
                    </AlertTitle>
                    <AlertDescription className="text-green-600 dark:text-green-500">
                      Processing complete. Redirecting to reader...
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-between gap-3">
                    <Button onClick={handleResetUpload} variant="outline">
                      Upload Another File
                    </Button>
                    <Button
                      onClick={() => router.push(`/highlights/read/${uploadState.sourceId}`)}
                      size="lg"
                    >
                      Start Reading Now
                    </Button>
                  </div>
                </div>
              )}

              {/* Info Section */}
              {!uploadState.file && !uploadState.error && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm">How it works:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Select a PDF or EPUB file from your computer</li>
                    <li>We'll extract the text content and metadata</li>
                    <li>The file is saved securely in your library</li>
                    <li>Start reading and highlighting immediately</li>
                  </ol>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Additional Info Card */}
      {activeTab === 'url' && state === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supported Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">✅ Works Great</p>
                  <p className="text-xs text-muted-foreground">
                    Medium, Substack, Dev.to, personal blogs, most documentation sites
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">✓ Usually Works</p>
                  <p className="text-xs text-muted-foreground">
                    News sites, research papers, essays, long-form content
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">⚠️ May Be Blocked</p>
                  <p className="text-xs text-muted-foreground">
                    Sites with paywalls, heavy bot protection (Forbes, WSJ), or login requirements
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
