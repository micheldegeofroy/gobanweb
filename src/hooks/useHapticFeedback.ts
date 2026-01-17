'use client';

import { useCallback, useRef } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'select';

// Vibration patterns in milliseconds
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20],
  error: [50, 100, 50],
  select: 15,
};

export function useHapticFeedback() {
  const lastVibration = useRef<number>(0);
  const minInterval = 50; // Minimum ms between vibrations

  const vibrate = useCallback((pattern: HapticPattern = 'light') => {
    // Prevent rapid-fire vibrations
    const now = Date.now();
    if (now - lastVibration.current < minInterval) {
      return;
    }
    lastVibration.current = now;

    // Check if vibration API is supported
    if (typeof navigator === 'undefined' || !navigator.vibrate) {
      return;
    }

    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // Vibration not supported or blocked
    }
  }, []);

  const stonePlaced = useCallback(() => vibrate('medium'), [vibrate]);
  const stonePickedUp = useCallback(() => vibrate('light'), [vibrate]);
  const capture = useCallback(() => vibrate('success'), [vibrate]);
  const invalidMove = useCallback(() => vibrate('error'), [vibrate]);
  const buttonTap = useCallback(() => vibrate('select'), [vibrate]);

  return {
    vibrate,
    stonePlaced,
    stonePickedUp,
    capture,
    invalidMove,
    buttonTap,
  };
}
