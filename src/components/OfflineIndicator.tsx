'use client';

import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePendingCount = () => {
      try {
        const stored = localStorage.getItem('gobanweb_offline_queue');
        const queue = stored ? JSON.parse(stored) : [];
        setPendingCount(queue.length);
      } catch {
        setPendingCount(0);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      // Show brief "back online" message
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    // Initialize
    setIsOnline(navigator.onLine);
    updatePendingCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count periodically
    const interval = setInterval(updatePendingCount, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Don't show anything if online and no banner needed
  if (isOnline && !showBanner && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium pointer-events-auto">
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
            You&apos;re offline - changes will sync when reconnected
            {pendingCount > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {pendingCount} pending
              </span>
            )}
          </span>
        </div>
      )}

      {/* Back online banner */}
      {isOnline && showBanner && (
        <div className="bg-green-600 text-white px-4 py-2 text-center text-sm font-medium animate-slide-down pointer-events-auto">
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 13l4 4L19 7" />
            </svg>
            Back online
            {pendingCount > 0 ? ' - syncing changes...' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
