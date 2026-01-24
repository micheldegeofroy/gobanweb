'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CrazyGoHome() {
  const router = useRouter();
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(13);
  const [isCreating, setIsCreating] = useState(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-zinc-800 dark:text-zinc-100 mb-4">
            Crazy Go
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            4 Players, More Fun!
          </p>
        </header>

        <div className="max-w-md mx-auto">
          {/* Single Card for Create - Wood effect */}
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
            {/* Stone Preview */}
            <div className="flex justify-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-zinc-900 shadow-lg" title="Black" />
              <div className="w-10 h-10 rounded-full bg-zinc-100 border-2 border-zinc-300 shadow-lg" title="White" />
              <div className="w-10 h-10 rounded-full bg-zinc-100 border-2 border-zinc-300 shadow-lg relative overflow-hidden" title="White Cross">
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-zinc-900" />
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-900" />
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-900 shadow-lg relative overflow-hidden" title="Black Cross">
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white" />
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white" />
              </div>
            </div>

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

        {error && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-center">
              {error}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="max-w-md mx-auto mt-16 text-center">
          <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            How it works
          </h3>
          <div className="grid gap-6 md:grid-cols-2 text-left">
            <div className="bg-white/50 dark:bg-zinc-800/50 rounded-xl p-6">
              <div className="text-3xl mb-3">1</div>
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                Create a board
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Choose your board size and create a new shared board.
              </p>
            </div>
            <div className="bg-white/50 dark:bg-zinc-800/50 rounded-xl p-6">
              <div className="text-3xl mb-3">2</div>
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                Share & Play
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Send the Board URL to anyone and play like on a real board.
              </p>
            </div>
          </div>
        </div>

        {/* Crazy Go Rules */}
        <div className="max-w-md mx-auto mt-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Crazy Go Rules
          </h3>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 text-left px-4">
            <li>• <strong>4 Players</strong> - Black → White → White-Cross → Black-Cross</li>
            <li>• <strong>Turn Order</strong> - Highlighted pot shows current player</li>
            <li>• <strong>Capturing</strong> - Surround to capture, no fixed alliances</li>
            <li>• <strong>Ko Rule</strong> - No immediate recapture of single stones</li>
          </ul>
        </div>

        {/* Features */}
        <section className="max-w-md mx-auto mt-12 text-center">
          <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            Why Play Go on Goban Web?
          </h2>
          <div className="bg-white/50 dark:bg-zinc-800/50 rounded-xl p-6">
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 text-left">
              <li>• <strong>No login or signup</strong> - start playing in seconds</li>
              <li>• <strong>Works on any device</strong> - iPad, Android tablet, iPhone, phone</li>
              <li>• <strong>Play locally or remotely</strong> - share a link with friends</li>
              <li>• <strong>Real board feel</strong> - pick up, place & move stones freely</li>
              <li>• <strong>Real-time sync</strong> - all players see moves instantly</li>
              <li>• <strong>Free forever</strong> - no ads, no premium features</li>
            </ul>
          </div>
        </section>

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
