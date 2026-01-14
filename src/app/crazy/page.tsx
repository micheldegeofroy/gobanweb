'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CrazyGoHome() {
  const router = useRouter();
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(19);
  const [isCreating, setIsCreating] = useState(false);
  const [boardUrl, setBoardUrl] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const createGame = async () => {
    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/crazy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardSize }),
      });

      if (!res.ok) {
        throw new Error('Failed to create board');
      }

      const data = await res.json();

      // Store the private key in localStorage for this game
      localStorage.setItem(`crazy_${data.gameId}_privateKey`, data.privateKey);

      // Navigate to game page with key in URL
      router.push(`/crazy/${data.gameId}?key=${encodeURIComponent(data.privateKey)}`);
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
        localStorage.setItem(`crazy_${gameId}_privateKey`, key);
        router.push(`/crazy/${gameId}?key=${encodeURIComponent(key)}`);
      } else {
        router.push(`/crazy/${gameId}`);
      }
    } catch (err) {
      setError('Invalid board URL. Please paste the full URL.');
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-zinc-900">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-zinc-800 dark:text-zinc-100 mb-4">
            Crazy Go
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            4-Player Chaos Mode
          </p>
        </header>

        <div className="max-w-md mx-auto">
          {/* Stone Preview */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-zinc-900 shadow-lg" title="Black" />
            <div className="w-10 h-10 rounded-full bg-zinc-100 border-2 border-zinc-300 shadow-lg" title="White" />
            <div className="w-10 h-10 rounded-full bg-amber-700 shadow-lg" title="Brown" />
            <div className="w-10 h-10 rounded-full bg-zinc-500 shadow-lg" title="Grey" />
          </div>

          {/* Single Card for Create and Join */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
            {/* Board Size Buttons */}
            <div className="flex gap-3 mb-4">
              {[9, 13, 19].map((size) => (
                <button
                  key={size}
                  onClick={() => setBoardSize(size as 9 | 13 | 19)}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    boardSize === size
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>

            {/* Create Board Button */}
            <button
              onClick={createGame}
              disabled={isCreating}
              className="w-full py-3 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Crazy Board'}
            </button>

            {/* Spacer */}
            <div style={{ height: '16px' }}></div>

            {/* Paste URL Input */}
            <input
              type="text"
              value={boardUrl}
              onChange={(e) => setBoardUrl(e.target.value)}
              placeholder="Paste Board URL"
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 text-center"
              onKeyDown={(e) => e.key === 'Enter' && joinGame()}
            />

            {/* Join Board Button */}
            <button
              onClick={joinGame}
              disabled={isJoining}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : 'Join Board'}
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-center">
              {error}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="max-w-md mx-auto mt-16 text-center">
          <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            How Crazy Go Works
          </h3>
          <div className="bg-white/50 dark:bg-zinc-800/50 rounded-xl p-6">
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 text-left">
              <li>• <strong>4 Players</strong> - Black, White, Brown, and Grey</li>
              <li>• <strong>Same Rules</strong> - Capture by surrounding, no suicide</li>
              <li>• <strong>Free-for-all</strong> - Any stone can capture any other color</li>
              <li>• <strong>Shared Board</strong> - Everyone plays on the same board</li>
            </ul>
          </div>
        </div>

        {/* Back to Normal Go */}
        <div className="max-w-md mx-auto mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Back to Normal Go
          </button>
        </div>
      </div>
    </div>
  );
}
