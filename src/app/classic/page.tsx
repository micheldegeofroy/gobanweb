'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDeviceType } from '@/hooks/useDeviceType';

export default function Home() {
  const router = useRouter();
  const deviceType = useDeviceType();
  const isTablet = deviceType === 'tablet';
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(13);
  const [isCreating, setIsCreating] = useState(false);
  const [boardUrl, setBoardUrl] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [gameCount, setGameCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/games/count')
      .then(res => res.json())
      .then(data => setGameCount(data.count))
      .catch(() => {});
  }, []);

  const createGame = async () => {
    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardSize }),
      });

      if (!res.ok) {
        throw new Error('Failed to create board');
      }

      const data = await res.json();

      // Store the private key in localStorage for this game
      localStorage.setItem(`game_${data.gameId}_privateKey`, data.privateKey);

      // Navigate to game page with key in URL
      router.push(`/game/${data.gameId}?key=${encodeURIComponent(data.privateKey)}`);
    } catch (err) {
      setError('Failed to create board. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const joinGame = async () => {
    if (!boardUrl.trim()) {
      setError('Please paste a board URL');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      // Parse the URL to extract game ID and key
      const url = new URL(boardUrl.trim());
      const pathParts = url.pathname.split('/');
      const gameId = pathParts[pathParts.length - 1];
      const key = url.searchParams.get('key');

      if (!gameId) {
        setError('Invalid board URL');
        setIsJoining(false);
        return;
      }

      // Store the private key if present and navigate
      if (key) {
        localStorage.setItem(`game_${gameId}_privateKey`, key);
        router.push(`/game/${gameId}?key=${encodeURIComponent(key)}`);
      } else {
        router.push(`/game/${gameId}`);
      }
    } catch (err) {
      setError('Invalid board URL. Please paste the full URL.');
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800 ${isTablet ? 'flex flex-col' : ''}`}>
      <div className={`container mx-auto px-4 ${isTablet ? 'flex-1 flex flex-col justify-center py-8' : 'py-16'}`}>
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-zinc-800 dark:text-zinc-100 mb-4">
            Online Go
          </h1>
          {gameCount !== null && (
            <p className="text-lg font-semibold mt-2 text-white">
              {gameCount} games played!
            </p>
          )}
        </header>

        <div className="max-w-md mx-auto">
          {/* Single Card for Create and Join - Wood effect */}
          <div
            className="rounded-2xl shadow-xl p-8"
            style={{
              backgroundColor: '#DEB887',
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 7px,
                rgba(139, 90, 43, 0.08) 7px,
                rgba(139, 90, 43, 0.08) 8px
              )`
            }}
          >
            {/* Board Size Buttons */}
            <div className="flex gap-3 mb-4">
              {[9, 13, 19].map((size) => (
                <button
                  key={size}
                  onClick={() => setBoardSize(size as 9 | 13 | 19)}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    boardSize === size
                      ? 'bg-white text-black shadow-md'
                      : 'bg-black text-white hover:bg-zinc-800'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Create Board Button */}
            <button
              onClick={createGame}
              disabled={isCreating}
              className="w-full py-3 bg-black dark:bg-zinc-100 text-white dark:text-zinc-800 rounded-lg font-semibold hover:bg-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Board'}
            </button>

          </div>
        </div>

        {/* Tutorial Button */}
        <div className="max-w-md mx-auto mt-4">
          <button
            onClick={() => router.push('/tutorial')}
            className="w-full py-3 bg-white text-black rounded-lg font-semibold hover:bg-zinc-100 transition-colors"
          >
            Free Tutorial
          </button>
        </div>

        {error && (
          <div className="max-w-md mx-auto mt-4">
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-center">
              {error}
            </div>
          </div>
        )}

        {/* Back to Menu */}
        <div className="max-w-md mx-auto mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium hover:underline text-zinc-400 hover:text-zinc-200"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
