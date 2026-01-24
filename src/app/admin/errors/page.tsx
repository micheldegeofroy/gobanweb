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
  zen: ErrorToggle[];
  bang: ErrorToggle[];
}

export default function ErrorTogglesPage() {
  const router = useRouter();
  const [toggles, setToggles] = useState<ErrorToggles | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    normal: true,
    crazy: true,
    wilde: true,
    zen: true,
    bang: true,
  });

  useEffect(() => {
    // Check auth
    const auth = localStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    fetchToggles();
  }, [router]);

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
        setToggles(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          for (const gameType of ['normal', 'crazy', 'wilde', 'zen', 'bang'] as const) {
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!toggles) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Failed to load error toggles</div>
      </div>
    );
  }

  const gameTypes = [
    { key: 'normal', label: 'Classic Go' },
    { key: 'crazy', label: 'Crazy Go (4-player)' },
    { key: 'wilde', label: 'Wilde Go (2-8 players)' },
    { key: 'zen', label: 'Zen Go (3-player)' },
    { key: 'bang', label: 'Go Bang (mines)' },
  ] as const;

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Error Toggles</h1>
            <p className="text-gray-400 mt-1">Enable or disable error validations for testing</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 border border-white hover:bg-white hover:text-black transition-colors"
          >
            Back
          </button>
        </div>

        {/* Global Controls */}
        <div className="border border-white p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleBulkToggle('all', true)}
              disabled={updating === 'all'}
              className="px-4 py-2 bg-white text-black font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors min-w-[120px]"
            >
              {updating === 'all' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </span>
              ) : 'Enable All'}
            </button>
            <button
              onClick={() => handleBulkToggle('all', false)}
              disabled={updating === 'all'}
              className="px-4 py-2 border border-white hover:bg-white hover:text-black disabled:opacity-50 transition-colors min-w-[120px]"
            >
              {updating === 'all' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </span>
              ) : 'Disable All'}
            </button>
          </div>
        </div>

        {/* Game Type Sections */}
        {gameTypes.map(({ key, label }) => {
          const errors = toggles[key];
          const enabledCount = getEnabledCount(errors);
          const isExpanded = expandedSections[key];

          return (
            <div key={key} className="border border-white mb-4 overflow-hidden">
              {/* Section Header */}
              <div className="px-4 py-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => toggleSection(key)}
                >
                  <h2 className="text-xl font-semibold">{label}</h2>
                  <span className="text-gray-400 text-sm">
                    ({enabledCount}/{errors.length} enabled)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleBulkToggle(key, true)}
                    disabled={updating === key}
                    className="px-3 py-1 text-sm border border-white hover:bg-white hover:text-black transition-colors min-w-[70px] disabled:opacity-50"
                  >
                    {updating === key ? (
                      <svg className="animate-spin h-4 w-4 mx-auto" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : 'All On'}
                  </button>
                  <button
                    onClick={() => handleBulkToggle(key, false)}
                    disabled={updating === key}
                    className="px-3 py-1 text-sm border border-gray-600 text-gray-400 hover:border-white hover:text-white transition-colors min-w-[70px] disabled:opacity-50"
                  >
                    {updating === key ? (
                      <svg className="animate-spin h-4 w-4 mx-auto" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : 'All Off'}
                  </button>
                  <svg
                    className={`w-5 h-5 transition-transform cursor-pointer ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    onClick={() => toggleSection(key)}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Error List */}
              {isExpanded && (
                <div className="border-t border-gray-800">
                  {errors.map((error, index) => (
                    <div
                      key={error.id}
                      className={`px-4 py-3 flex items-center justify-between ${
                        index !== errors.length - 1 ? 'border-b border-gray-800' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <code className="text-sm text-gray-300 break-all">{error.message}</code>
                      </div>
                      <button
                        onClick={() => handleToggle(error.id, error.enabled)}
                        disabled={updating === error.id}
                        className={`relative w-12 h-6 transition-colors ${
                          error.enabled ? 'bg-white' : 'bg-gray-700'
                        } ${updating === error.id ? 'opacity-50' : ''}`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 transition-transform ${
                            error.enabled ? 'left-7 bg-black' : 'left-1 bg-white'
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
      </div>
    </div>
  );
}
