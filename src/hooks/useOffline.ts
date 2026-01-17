'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface QueuedAction {
  id: string;
  gameId: string;
  gameType: 'games' | 'crazy' | 'wilde';
  actionType: 'place' | 'remove' | 'move';
  privateKey: string;
  options: Record<string, unknown>;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'gobanweb_offline_queue';
const GAME_STATE_PREFIX = 'gobanweb_game_';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Initialize online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineActions();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker sync message
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_OFFLINE_ACTIONS') {
          syncOfflineActions();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get queued actions from localStorage
  const getQueuedActions = useCallback((): QueuedAction[] => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save queued actions to localStorage
  const saveQueuedActions = useCallback((actions: QueuedAction[]) => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(actions));
    } catch (e) {
      console.error('Failed to save offline queue:', e);
    }
  }, []);

  // Queue an action for later sync
  const queueAction = useCallback((
    gameId: string,
    gameType: 'games' | 'crazy' | 'wilde',
    actionType: 'place' | 'remove' | 'move',
    privateKey: string,
    options: Record<string, unknown>
  ) => {
    const action: QueuedAction = {
      id: crypto.randomUUID(),
      gameId,
      gameType,
      actionType,
      privateKey,
      options,
      timestamp: Date.now(),
    };

    const queue = getQueuedActions();
    queue.push(action);
    saveQueuedActions(queue);

    // Register for background sync if supported
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
          .sync.register('sync-game-actions');
      }).catch(() => {});
    }

    return action.id;
  }, [getQueuedActions, saveQueuedActions]);

  // Sync all queued actions
  const syncOfflineActions = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;

    syncingRef.current = true;
    setIsSyncing(true);

    const queue = getQueuedActions();
    if (queue.length === 0) {
      syncingRef.current = false;
      setIsSyncing(false);
      return;
    }

    const failedActions: QueuedAction[] = [];

    for (const action of queue) {
      try {
        const res = await fetch(`/api/${action.gameType}/${action.gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            privateKey: action.privateKey,
            actionType: action.actionType,
            ...action.options,
          }),
        });

        if (!res.ok) {
          // If it's a conflict (game state changed), skip this action
          const data = await res.json();
          if (data.error?.includes('conflict') || data.error?.includes('stale')) {
            console.warn('Skipping stale offline action:', action.id);
            continue;
          }
          // Other errors - keep in queue to retry
          failedActions.push(action);
        }
      } catch (e) {
        // Network error - keep in queue
        failedActions.push(action);
      }
    }

    saveQueuedActions(failedActions);
    syncingRef.current = false;
    setIsSyncing(false);
  }, [getQueuedActions, saveQueuedActions]);

  // Save game state locally
  const saveGameState = useCallback((gameId: string, gameType: string, state: unknown) => {
    try {
      const key = `${GAME_STATE_PREFIX}${gameType}_${gameId}`;
      localStorage.setItem(key, JSON.stringify({
        state,
        savedAt: Date.now(),
      }));
    } catch (e) {
      console.error('Failed to save game state:', e);
    }
  }, []);

  // Load game state from local storage
  const loadGameState = useCallback(<T>(gameId: string, gameType: string): T | null => {
    try {
      const key = `${GAME_STATE_PREFIX}${gameType}_${gameId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const { state } = JSON.parse(stored);
        return state as T;
      }
    } catch (e) {
      console.error('Failed to load game state:', e);
    }
    return null;
  }, []);

  // Clear saved game state
  const clearGameState = useCallback((gameId: string, gameType: string) => {
    try {
      const key = `${GAME_STATE_PREFIX}${gameType}_${gameId}`;
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }, []);

  // Get pending action count
  const getPendingCount = useCallback(() => {
    return getQueuedActions().length;
  }, [getQueuedActions]);

  return {
    isOnline,
    isSyncing,
    queueAction,
    syncOfflineActions,
    saveGameState,
    loadGameState,
    clearGameState,
    getPendingCount,
  };
}
