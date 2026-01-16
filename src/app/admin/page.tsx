'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ErrorToggle {
  id: string;
  message: string;
  enabled: boolean;
}

interface ErrorToggles {
  normal: ErrorToggle[];
  crazy: ErrorToggle[];
  wilde: ErrorToggle[];
}

export default function AdminPage() {
  const router = useRouter();
  const [toggles, setToggles] = useState<ErrorToggles | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    normal: true,
    crazy: true,
    wilde: true,
  });

  useEffect(() => {
    fetchToggles();
  }, []);

  const fetchToggles = async () => {
    try {
      const res = await fetch('/api/admin/errors');
      if (res.ok) {
        const data = await res.json();
        setToggles(data);
      }
    } catch (err) {
      console.error('Failed to fetch toggles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    setUpdating(id);
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });

      if (res.ok) {
        // Update local state
        setToggles(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          for (const gameType of ['normal', 'crazy', 'wilde'] as const) {
            updated[gameType] = updated[gameType].map(t =>
              t.id === id ? { ...t, enabled: !currentEnabled } : t
            );
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to update toggle:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleBulkToggle = async (gameType: string | 'all', enabled: boolean) => {
    setUpdating(gameType);
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType, enabled }),
      });

      if (res.ok) {
        // Refresh all toggles
        await fetchToggles();
      }
    } catch (err) {
      console.error('Failed to bulk update:', err);
    } finally {
      setUpdating(null);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getEnabledCount = (errors: ErrorToggle[]) => {
    return errors.filter(e => e.enabled).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-zinc-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!toggles) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Failed to load error toggles</div>
      </div>
    );
  }

  const gameTypes = [
    { key: 'normal', label: 'Normal Go', color: 'amber' },
    { key: 'crazy', label: 'Crazy Go (4-player)', color: 'purple' },
    { key: 'wilde', label: 'Wilde Go (2-8 players)', color: 'emerald' },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Error Toggles</h1>
            <p className="text-zinc-400 mt-1">Enable or disable error validations for testing</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* Global Controls */}
        <div className="bg-zinc-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleBulkToggle('all', true)}
              disabled={updating === 'all'}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 rounded-lg font-medium transition-colors"
            >
              Enable All
            </button>
            <button
              onClick={() => handleBulkToggle('all', false)}
              disabled={updating === 'all'}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 rounded-lg font-medium transition-colors"
            >
              Disable All
            </button>
          </div>
        </div>

        {/* Game Type Sections */}
        {gameTypes.map(({ key, label, color }) => {
          const errors = toggles[key];
          const enabledCount = getEnabledCount(errors);
          const isExpanded = expandedSections[key];

          return (
            <div key={key} className="bg-zinc-800 rounded-xl mb-4 overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(key)}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full bg-${color}-500`} />
                  <h2 className="text-xl font-semibold">{label}</h2>
                  <span className="text-zinc-400 text-sm">
                    ({enabledCount}/{errors.length} enabled)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBulkToggle(key, true); }}
                    disabled={updating === key}
                    className="px-3 py-1 text-sm bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded transition-colors"
                  >
                    All On
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBulkToggle(key, false); }}
                    disabled={updating === key}
                    className="px-3 py-1 text-sm bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
                  >
                    All Off
                  </button>
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Error List */}
              {isExpanded && (
                <div className="border-t border-zinc-700">
                  {errors.map((error, index) => (
                    <div
                      key={error.id}
                      className={`px-4 py-3 flex items-center justify-between ${
                        index !== errors.length - 1 ? 'border-b border-zinc-700/50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <code className="text-sm text-zinc-300 break-all">{error.message}</code>
                      </div>
                      <button
                        onClick={() => handleToggle(error.id, error.enabled)}
                        disabled={updating === error.id}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          error.enabled
                            ? 'bg-green-600'
                            : 'bg-zinc-600'
                        } ${updating === error.id ? 'opacity-50' : ''}`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            error.enabled ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Info Box */}
        <div className="bg-zinc-800/50 rounded-xl p-4 mt-6">
          <h3 className="font-semibold text-zinc-300 mb-2">How it works</h3>
          <ul className="text-sm text-zinc-400 space-y-1">
            <li>- Toggle OFF to skip that validation check in the API</li>
            <li>- Useful for testing edge cases without restrictions</li>
            <li>- Changes take effect immediately</li>
            <li>- Settings persist in the database</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
