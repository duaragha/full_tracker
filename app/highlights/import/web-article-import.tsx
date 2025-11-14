'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, Loader2, CheckCircle2, AlertCircle, ArrowRight, BookOpen } from 'lucide-react'
import { saveArticleAction } from '@/app/actions/highlights'
import { HighlightSource } from '@/types/highlight'
import Link from 'next/link'

type FetchState = 'idle' | 'loading' | 'success' | 'error'

interface ArticlePreview {
  source: HighlightSource
  wordCount: number
  readingTimeMinutes: number
}

export function WebArticleImport() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<FetchState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [preview, setPreview] = useState<ArticlePreview | null>(null)

  const handleFetchArticle = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      setError('Please enter a URL')
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Save Web Article</CardTitle>
        <CardDescription>
          Enter a URL to save an article and create highlights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input Form */}
        {(state === 'idle' || state === 'loading') && (
          <form onSubmit={handleFetchArticle} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="article-url">Article URL *</Label>
              <div className="flex gap-2">
                <Input
                  id="article-url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={state === 'loading'}
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={state === 'loading'}>
                  {state === 'loading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Fetch Article
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm">Tip:</h4>
              <p className="text-sm text-muted-foreground">
                After fetching the article, you'll be able to read it in a clean format and create highlights by selecting text.
              </p>
            </div>
          </form>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-destructive mb-1">{error}</h4>
                  {errorDetails && (
                    <p className="text-sm text-destructive/80">{errorDetails}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm">Common Issues:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>The article may be behind a paywall</li>
                <li>The URL may require authentication</li>
                <li>The page may not contain article content</li>
                <li>The site may be blocking automated requests</li>
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
            <div className="border border-green-500/50 bg-green-500/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1">
                    Article saved successfully!
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    The article has been saved and is ready for highlighting.
                  </p>
                </div>
              </div>
            </div>

            {/* Article Preview Card */}
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-lg mb-1">{preview.source.title}</h3>
                {preview.source.author && (
                  <p className="text-sm text-muted-foreground">by {preview.source.author}</p>
                )}
              </div>

              {preview.source.excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {preview.source.excerpt}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{preview.wordCount.toLocaleString()} words</span>
                </div>
                <div>
                  {preview.readingTimeMinutes} min read
                </div>
                {preview.source.domain && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <span>{preview.source.domain}</span>
                  </div>
                )}
              </div>

              {preview.source.url && (
                <div className="pt-2 border-t">
                  <a
                    href={preview.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate block"
                  >
                    {preview.source.url}
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-2">
              <Button onClick={handleReset} variant="outline">
                Save Another Article
              </Button>
              <Button asChild>
                <Link href={`/highlights?sourceId=${preview.source.id}`}>
                  View Article & Create Highlights
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
