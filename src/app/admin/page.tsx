'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ADMIN_PASSWORD = 'goban2024'; // Simple password

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setAlertsEnabled(data.alerts_enabled !== 'false');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
      setError('');
      fetchSettings();
    } else {
      setError('Incorrect password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
    setPassword('');
  };

  const handleToggleAlerts = async () => {
    setSaving(true);
    const newValue = !alertsEnabled;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'alerts_enabled', value: String(newValue) }),
      });

      if (res.ok) {
        setAlertsEnabled(newValue);

        // Also update all error toggles to match
        await fetch('/api/admin/errors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameType: 'all', enabled: newValue }),
        });
      }
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setSaving(false);
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-white text-3xl font-bold text-center mb-8">Admin</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-white text-black border-2 border-white rounded-none focus:outline-none focus:ring-0"
              autoFocus
            />

            {error && (
              <p className="text-white text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full px-4 py-3 bg-white text-black font-bold hover:bg-gray-200 transition-colors"
            >
              Login
            </button>
          </form>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-4 px-4 py-3 border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Admin panel
  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-bold">Admin</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-white hover:bg-white hover:text-black transition-colors"
            >
              Home
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-white hover:bg-white hover:text-black transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Master Alerts Toggle */}
        <div className="border border-white p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Site Alerts</h2>
              <p className="text-gray-400 mt-1">
                {alertsEnabled ? 'All validation alerts are enabled' : 'All validation alerts are disabled'}
              </p>
            </div>
            <button
              onClick={handleToggleAlerts}
              disabled={saving}
              className={`relative w-16 h-8 transition-colors ${
                alertsEnabled ? 'bg-white' : 'bg-gray-700'
              } ${saving ? 'opacity-50' : ''}`}
            >
              <div
                className={`absolute top-1 w-6 h-6 transition-all ${
                  alertsEnabled
                    ? 'left-9 bg-black'
                    : 'left-1 bg-white'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Legal Pages Editor Link */}
        <div className="border border-white p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Legal Pages</h2>
              <p className="text-gray-400 mt-1">Edit terms and conditions, privacy policy</p>
            </div>
            <button
              onClick={() => router.push('/admin/legal')}
              className="px-4 py-2 bg-white text-black font-bold hover:bg-gray-200 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Error Toggles Link */}
        <div className="border border-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Error Toggles</h2>
              <p className="text-gray-400 mt-1">Fine-tune individual validation rules</p>
            </div>
            <button
              onClick={() => router.push('/admin/errors')}
              className="px-4 py-2 bg-white text-black font-bold hover:bg-gray-200 transition-colors"
            >
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
