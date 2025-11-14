'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { subscribeToRSSFeedAction } from '@/app/actions/rss'
import { useRouter } from 'next/navigation'
import { Plus, Rss, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export function RSSSubscribeDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    title: string
    itemsFound: number
    itemsNew: number
  } | null>(null)

  const handleSubscribe = async () => {
    if (!feedUrl.trim()) {
      setError('Please enter a feed URL')
      return
    }

    // Basic URL validation
    try {
      new URL(feedUrl)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setPreview(null)

    try {
      const result = await subscribeToRSSFeedAction(feedUrl)

      if (result.success && result.feed) {
        setPreview({
          title: result.feed.title,
          itemsFound: result.feed.itemsFound,
          itemsNew: result.feed.itemsNew,
        })

        // Wait a moment to show success, then close and refresh
        setTimeout(() => {
          setOpen(false)
          setFeedUrl('')
          setPreview(null)
          router.refresh()
        }, 1500)
      } else {
        setError(result.error || 'Failed to subscribe to feed')
        if (result.details) {
          setError(`${result.error}: ${result.details}`)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Subscribe error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen)
      if (!newOpen) {
        // Reset state when closing
        setFeedUrl('')
        setError(null)
        setPreview(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add RSS Feed
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rss className="h-5 w-5" />
            Subscribe to RSS Feed
          </DialogTitle>
          <DialogDescription>
            Enter the URL of an RSS or Atom feed to subscribe. New articles will be automatically fetched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feed-url">Feed URL</Label>
            <Input
              id="feed-url"
              type="url"
              placeholder="https://example.com/feed.xml"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              disabled={isLoading || !!preview}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && !preview) {
                  handleSubscribe()
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Paste the RSS feed URL from your favorite blog or website
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Successfully subscribed!</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 mt-2">
                  <p className="font-medium">{preview.title}</p>
                  <p className="text-sm">
                    Found {preview.itemsFound} items, {preview.itemsNew} new
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubscribe}
            disabled={isLoading || !feedUrl.trim() || !!preview}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : preview ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Subscribed
              </>
            ) : (
              'Subscribe'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
