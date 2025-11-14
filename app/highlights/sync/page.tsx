'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Cloud,
  CloudOff,
  RefreshCw,
  ShieldAlert,
  Clock,
  BookOpen,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react'
import Link from 'next/link'
import {
  saveAmazonCredentialsAction,
  deleteAmazonCredentialsAction,
  syncKindleHighlightsAction,
  getLastSyncStatusAction,
  getSyncHistoryAction,
  hasAmazonCredentialsAction,
} from '@/app/actions/kindle-sync'

interface SyncLog {
  id: number
  status: string
  highlightsImported: number
  sourcesCreated: number
  duplicatesSkipped: number
  booksProcessed: any
  errorMessage: string | null
  durationSeconds: number | null
  startedAt: string
  completedAt: string | null
}

export default function KindleSyncPage() {
  const [hasCredentials, setHasCredentials] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    highlightsImported: number
    sourcesCreated: number
    duplicatesSkipped: number
    booksProcessed: number
  } | null>(null)

  // Last sync info
  const [lastSync, setLastSync] = useState<any>(null)

  // History state
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([])

  // Load settings
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)

      // Check if credentials exist
      const hasCredsResult = await hasAmazonCredentialsAction()
      setHasCredentials(hasCredsResult)

      // Get last sync status
      const statusResult = await getLastSyncStatusAction()
      if (statusResult.success) {
        setLastSync(statusResult.lastSync)
      }

      // Load sync history
      const historyResult = await getSyncHistoryAction(5, 0)
      if (historyResult.success) {
        setSyncHistory(historyResult.logs as SyncLog[])
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('Failed to load sync settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCredentials = async () => {
    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await saveAmazonCredentialsAction(email, password)

      if (result.success) {
        setSuccess('Amazon credentials saved successfully')
        setPassword('') // Clear password field
        await loadSettings()
      } else {
        setError(result.error || 'Failed to save credentials')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Amazon account? Your existing highlights will not be deleted.')) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await deleteAmazonCredentialsAction()

      if (result.success) {
        setSuccess('Amazon account disconnected')
        setEmail('')
        setPassword('')
        await loadSettings()
      } else {
        setError(result.error || 'Failed to disconnect')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      const result = await syncKindleHighlightsAction()

      if (result.success) {
        setSyncResult({
          highlightsImported: result.highlightsImported,
          sourcesCreated: result.sourcesCreated,
          duplicatesSkipped: result.duplicatesSkipped,
          booksProcessed: result.booksProcessed,
        })
        await loadSettings()
      } else {
        setError(result.error || 'Sync failed')
      }
    } catch (err) {
      setError('An unexpected error occurred during sync')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
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
        <h1 className="text-3xl font-bold tracking-tight">Kindle Sync</h1>
        <p className="text-muted-foreground mt-1">
          Automatically sync your Kindle highlights from Amazon
        </p>
      </div>

      {/* Security Warning */}
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription>
          Your Amazon credentials are stored encrypted in the database. We recommend using Amazon's
          App-Specific Password if available. Note: Two-factor authentication (2FA) may require
          manual intervention during sync.
        </AlertDescription>
      </Alert>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      {hasCredentials && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-green-600" />
                  <div>
                    <CardTitle>Connected to Amazon</CardTitle>
                    <CardDescription>
                      Your Amazon account is connected and ready to sync
                    </CardDescription>
                  </div>
                </div>
              </div>
              <Button variant="destructive" onClick={handleDisconnect} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Disconnect
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Credentials Form */}
      {!hasCredentials && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Amazon Account</CardTitle>
            <CardDescription>
              Enter your Amazon credentials to enable automatic Kindle sync
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Amazon Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Amazon Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your Amazon password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
              />
            </div>

            <Button onClick={handleSaveCredentials} disabled={saving || !email || !password}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Connect Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual Sync */}
      {hasCredentials && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Sync</CardTitle>
            <CardDescription>Trigger a manual sync of your Kindle highlights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm">
                  Last synced:{' '}
                  {lastSync?.startedAt ? (
                    <span className="font-medium">
                      {new Date(lastSync.startedAt).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </p>
                {lastSync && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        lastSync.status === 'success'
                          ? 'default'
                          : lastSync.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {lastSync.status}
                    </Badge>
                    {lastSync.status === 'success' && (
                      <span className="text-sm text-muted-foreground">
                        {lastSync.highlightsImported} new highlights,{' '}
                        {lastSync.sourcesCreated} new books
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Button onClick={handleSyncNow} disabled={syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>

            {/* Sync Result */}
            {syncResult && (
              <div className="mt-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Sync Completed</AlertTitle>
                  <AlertDescription>
                    Imported {syncResult.highlightsImported} new highlights from{' '}
                    {syncResult.booksProcessed} books. Skipped {syncResult.duplicatesSkipped}{' '}
                    duplicates.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync History */}
      {syncHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync History</CardTitle>
            <CardDescription>Your latest sync operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncHistory.map((history) => (
                <div
                  key={history.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {history.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : history.status === 'failed' ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">Sync</p>
                        <Badge
                          variant={
                            history.status === 'success'
                              ? 'default'
                              : history.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {history.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(history.startedAt).toLocaleString()}
                      </p>
                      {history.status === 'success' && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>
                            <BookOpen className="inline h-3 w-3 mr-1" />
                            {history.highlightsImported} imported
                          </span>
                          <span>
                            <Sparkles className="inline h-3 w-3 mr-1" />
                            {history.sourcesCreated} books
                          </span>
                          {history.durationSeconds && (
                            <span>
                              <Clock className="inline h-3 w-3 mr-1" />
                              {history.durationSeconds}s
                            </span>
                          )}
                        </div>
                      )}
                      {history.status === 'failed' && history.errorMessage && (
                        <p className="text-sm text-destructive mt-1">{history.errorMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternative Method */}
      <Card>
        <CardHeader>
          <CardTitle>Alternative: File Upload</CardTitle>
          <CardDescription>
            Prefer not to save your credentials? You can manually upload your Kindle highlights file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/highlights/import">
              <BookOpen className="mr-2 h-4 w-4" />
              Upload My Clippings.txt
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
