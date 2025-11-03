'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConflictResolver } from '@/components/plex/conflict-resolver';
import { ActivityLog } from '@/components/plex/activity-log';
import { MappingsList } from '@/components/plex/mappings-list';
import { Badge } from '@/components/ui/badge';

export default function PlexSettingsPage() {
  const [token, setToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [configured, setConfigured] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/plex/config');
      const data = await response.json();

      if (data.configured) {
        setConfigured(true);
        setConfig(data);
        setWebhookUrl(data.webhookUrl);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/plex/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plexToken: token }),
      });

      const data = await response.json();

      if (response.ok) {
        setWebhookUrl(data.webhookUrl);
        setConfigured(true);
        setMessage('Configuration saved successfully!');
        fetchConfig(); // Refresh config
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard!');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Plex Integration</h1>
        <p className="text-muted-foreground">
          Automatically sync watch history from your Plex server
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="conflicts">
            Conflicts
            {config?.conflictCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {config.conflictCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mappings">Mappings</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Connect your Plex server to automatically sync watch history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Badge */}
              {configured && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Badge variant="default">Connected</Badge>
                  <span className="text-sm">
                    Integration is active
                    {config?.lastWebhookReceived && (
                      <> • Last webhook: {new Date(config.lastWebhookReceived).toLocaleString()}</>
                    )}
                  </span>
                </div>
              )}

              {/* Plex Token Input */}
              <div>
                <Label htmlFor="token">Plex Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={configured ? '••••••••••••••••' : 'Enter your Plex token'}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Find your token in Plex Web App: Play media → ... → Get Info → View XML
                </p>
              </div>

              <Button onClick={handleSave} disabled={loading || !token}>
                {loading ? 'Saving...' : configured ? 'Update Configuration' : 'Save Configuration'}
              </Button>

              {message && (
                <div
                  className={`p-3 rounded ${
                    message.includes('Error')
                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Webhook URL */}
              {webhookUrl && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Webhook URL:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrl)}
                    >
                      Copy
                    </Button>
                  </div>
                  <code className="text-sm bg-background p-2 rounded block break-all">
                    {webhookUrl}
                  </code>
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">Add this URL in Plex:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                      <li>Open Plex Settings → Account → Webhooks</li>
                      <li>Click "Add Webhook"</li>
                      <li>Paste the webhook URL above</li>
                      <li>Save</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">How It Works</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Watch episodes on Plex</li>
                    <li>• Plex sends webhook to tracker</li>
                    <li>• Shows auto-matched using TMDB</li>
                    <li>• Episodes marked as watched</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• One-way sync (Plex → Tracker)</li>
                    <li>• Smart show matching</li>
                    <li>• Conflict resolution</li>
                    <li>• Activity logging</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts">
          <ConflictResolver />
        </TabsContent>

        <TabsContent value="mappings">
          <MappingsList />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
