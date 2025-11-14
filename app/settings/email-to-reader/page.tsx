'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Copy, Check, RefreshCw, Mail, Send, AlertCircle, CheckCircle2, Info } from 'lucide-react'

interface User {
  id: number
  email: string
  username: string
  emailToken: string
  emailEnabled: boolean
}

interface EmailImportLog {
  id: number
  fromAddress: string
  subject: string | null
  receivedAt: string
  status: string
  urlsFound: number
  articlesImported: number
  errorMessage: string | null
}

export default function EmailToReaderSettings() {
  const [user, setUser] = useState<User | null>(null)
  const [importLogs, setImportLogs] = useState<EmailImportLog[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Load user data
  useEffect(() => {
    loadUserData()
  }, [])

  async function loadUserData() {
    try {
      setLoading(true)

      // Fetch user data
      const userRes = await fetch('/api/settings/email-to-reader')
      if (userRes.ok) {
        const data = await userRes.json()
        setUser(data.user)
        setImportLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleEmailEnabled() {
    if (!user) return

    try {
      const res = await fetch('/api/settings/email-to-reader', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailEnabled: !user.emailEnabled }),
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error toggling email:', error)
    }
  }

  async function regenerateToken() {
    if (!user) return

    try {
      setRegenerating(true)
      const res = await fetch('/api/settings/email-to-reader/regenerate-token', {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setUser({ ...user, emailToken: data.token })
      }
    } catch (error) {
      console.error('Error regenerating token:', error)
    } finally {
      setRegenerating(false)
    }
  }

  async function sendTestEmail() {
    if (!testEmail || !user) return

    try {
      setTesting(true)
      setTestResult(null)

      const res = await fetch('/api/settings/email-to-reader/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testUrl: testEmail }),
      })

      const data = await res.json()
      setTestResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Test successful' : 'Test failed'),
      })

      if (res.ok) {
        // Reload logs to show the test
        loadUserData()
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      })
    } finally {
      setTesting(false)
    }
  }

  function copyEmailAddress() {
    if (!user) return

    const emailAddress = `${user.username}-${user.emailToken}@reader.yourdomain.com`
    navigator.clipboard.writeText(emailAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Email-to-Reader Not Available</CardTitle>
            <CardDescription>
              User account is required to use email-to-reader functionality.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const emailAddress = `${user.username}-${user.emailToken}@reader.yourdomain.com`

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Email-to-Reader</h1>
        <p className="text-muted-foreground mt-2">
          Forward articles to your personal email address to automatically import them
        </p>
      </div>

      {/* Email Address Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Your Personal Reader Email
          </CardTitle>
          <CardDescription>
            Forward emails containing article URLs to this address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Address Display */}
          <div className="flex gap-2">
            <Input
              value={emailAddress}
              readOnly
              className="font-mono text-sm"
              disabled={!user.emailEnabled}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyEmailAddress}
              disabled={!user.emailEnabled}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Email-to-Reader Enabled</Label>
              <p className="text-sm text-muted-foreground">
                Allow importing articles via email
              </p>
            </div>
            <Switch checked={user.emailEnabled} onCheckedChange={toggleEmailEnabled} />
          </div>

          {/* Regenerate Token */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={regenerateToken}
              disabled={regenerating}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
              Regenerate Email Address
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will create a new email address. Your old address will stop working.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Forward or send an email</p>
                <p className="text-sm text-muted-foreground">
                  Send an email to your personal reader address from any device
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Include article URLs</p>
                <p className="text-sm text-muted-foreground">
                  Paste one or more article URLs in the email body
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Articles are imported automatically</p>
                <p className="text-sm text-muted-foreground">
                  Your articles will appear in your library within seconds
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg mt-4">
            <p className="font-medium text-sm mb-2">Example email:</p>
            <div className="font-mono text-xs space-y-1 text-muted-foreground">
              <p>To: {emailAddress}</p>
              <p>Subject: Great article to read</p>
              <p className="mt-2">Body:</p>
              <p>Check out this article:</p>
              <p>https://example.com/interesting-article</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Email Import</CardTitle>
          <CardDescription>
            Test the email-to-reader functionality with a URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Article URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/article"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={testing || !user.emailEnabled}
              />
              <Button
                onClick={sendTestEmail}
                disabled={testing || !testEmail || !user.emailEnabled}
              >
                <Send className={`h-4 w-4 mr-2 ${testing ? 'animate-pulse' : ''}`} />
                Test
              </Button>
            </div>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg ${
                testResult.success
                  ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100'
                  : 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-sm">{testResult.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Imports */}
      {importLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Imports</CardTitle>
            <CardDescription>Last {importLogs.length} email imports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {importLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {log.subject || 'No subject'}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          log.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      From {log.fromAddress} • {new Date(log.receivedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.urlsFound} URL(s) found • {log.articlesImported} imported
                    </p>
                    {log.errorMessage && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
