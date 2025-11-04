'use client';

import { useState, useEffect } from 'react';

interface AudibleConfig {
  enabled: boolean;
  auto_sync_progress: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  sync_count_today: number;
  has_valid_token: boolean;
}

interface SyncStatus {
  success: boolean;
  books_synced: number;
  books_updated: number;
  new_mappings: number;
  conflicts: number;
  errors: any[];
  duration_ms: number;
}

export default function AudibleSettingsPage() {
  const [config, setConfig] = useState<AudibleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('us');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/audible/config');
      const data = await res.json();
      setConfig(data.config);
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthenticating(true);
    setError(null);

    try {
      const res = await fetch('/api/audible/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, country_code: countryCode }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Authentication successful! Tokens saved.');
        setPassword(''); // Clear password
        await loadConfig(); // Reload config
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Authentication request failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    setError(null);

    try {
      const res = await fetch('/api/audible/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });

      const data = await res.json();

      if (data.status === 'success' || data.status === 'partial') {
        setSyncStatus(data);
        await loadConfig(); // Reload config to get updated sync time
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError('Sync request failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (!config) return;

    try {
      const res = await fetch('/api/audible/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !config.enabled,
          auto_sync_progress: !config.enabled
        }),
      });

      const data = await res.json();
      if (data.success) {
        await loadConfig();
      }
    } catch (err) {
      setError('Failed to update configuration');
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Audible Integration Settings</h1>

      {/* Authentication Section */}
      {!config?.has_valid_token && (
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Sign in with Amazon</h2>
          <p className="text-sm text-gray-400 mb-4">
            Use your Amazon account credentials to access your Audible library.
            This is the same account you use to sign in to Audible.
          </p>
          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Amazon Email or Phone</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Amazon Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Audible Marketplace</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="ca">Canada</option>
                <option value="au">Australia</option>
                <option value="de">Germany</option>
                <option value="fr">France</option>
                <option value="jp">Japan</option>
                <option value="in">India</option>
                <option value="es">Spain</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={authenticating}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {authenticating ? 'Signing in...' : 'Sign in with Amazon'}
            </button>
          </form>
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded-md">
            <p className="text-xs text-yellow-300">
              <strong>Note:</strong> You may be prompted for:
            </p>
            <ul className="text-xs text-yellow-300 mt-1 ml-4 list-disc">
              <li>Two-factor authentication (2FA) code</li>
              <li>CAPTCHA verification</li>
              <li>Device approval notification</li>
            </ul>
            <p className="text-xs text-yellow-300 mt-2">
              Check the Python service terminal for any prompts.
            </p>
          </div>
        </div>
      )}

      {/* Configuration Section */}
      {config && (
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Sync Configuration</h2>

          <div className="space-y-4 text-gray-300">
            <div className="flex items-center justify-between">
              <span>Auto-sync enabled</span>
              <button
                onClick={handleToggleAutoSync}
                className={`px-4 py-2 rounded-md transition-colors ${
                  config.enabled
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {config.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span>Sync interval</span>
              <span className="font-mono text-blue-400">{config.sync_interval_minutes} minutes</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Last sync</span>
              <span className="font-mono text-blue-400">
                {config.last_sync_at
                  ? new Date(config.last_sync_at).toLocaleString()
                  : 'Never'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>Syncs today</span>
              <span className="font-mono text-blue-400">{config.sync_count_today}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Authentication status</span>
              <span className={config.has_valid_token ? 'text-green-400' : 'text-red-400'}>
                {config.has_valid_token ? 'Valid' : 'Invalid'}
              </span>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing || !config.has_valid_token}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Sync Status Section */}
      {syncStatus && (
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Last Sync Results</h2>
          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={syncStatus.success ? 'text-green-400' : 'text-yellow-400'}>
                {syncStatus.success ? 'Success' : 'Partial Success'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Books processed:</span>
              <span className="text-blue-400">{syncStatus.books_synced}</span>
            </div>
            <div className="flex justify-between">
              <span>Books updated:</span>
              <span className="text-blue-400">{syncStatus.books_updated}</span>
            </div>
            <div className="flex justify-between">
              <span>New mappings:</span>
              <span className="text-blue-400">{syncStatus.new_mappings}</span>
            </div>
            <div className="flex justify-between">
              <span>Conflicts:</span>
              <span className="text-blue-400">{syncStatus.conflicts}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="text-blue-400">{syncStatus.duration_ms}ms</span>
            </div>
            {syncStatus.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-900/20 border border-red-800 rounded">
                <p className="text-red-400 font-medium">Errors:</p>
                <ul className="text-sm text-red-400">
                  {syncStatus.errors.map((err, i) => (
                    <li key={i}>{err.asin}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}