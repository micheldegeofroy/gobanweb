'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ZenGoHome() {
  const router = useRouter();
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(13);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const createGame = async () => {
    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/zen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardSize }),
      });

      if (!res.ok) {
        throw new Error('Failed to create board');
      }

      const data = await res.json();

      // Store the private key in localStorage for this game
      localStorage.setItem(`zen_${data.gameId}_privateKey`, data.privateKey);

      // Navigate to game page with key in URL
      router.push(`/zen/${data.gameId}?key=${encodeURIComponent(data.privateKey)}`);
    } catch (err) {
      setError('Failed to create board. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-zinc-100 mb-4">
            Zen Go
          </h1>
          <p className="text-xl text-zinc-400">
            3 Players, One Shared Pot
          </p>
        </header>

        <div className="max-w-md mx-auto">
          {/* Single Card for Create - Grayscale wood effect */}
          <div
            className="rounded-2xl shadow-xl p-8"
            style={{
              backgroundColor: '#4a4a4a',
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 7px,
                rgba(60, 60, 60, 0.3) 7px,
                rgba(60, 60, 60, 0.3) 8px
              )`
            }}
          >
            {/* Stone Preview */}
            <div className="flex justify-center gap-6 mb-6">
              <div className="w-12 h-12 rounded-full bg-zinc-900 shadow-lg border border-zinc-700" title="Black" />
              <div className="w-12 h-12 rounded-full bg-zinc-100 border-2 border-zinc-300 shadow-lg" title="White" />
            </div>

            {/* Board Size Buttons */}
            <div className="flex gap-3 mb-4">
              {[9, 13, 19].map((size) => (
                <button
                  key={size}
                  onClick={() => setBoardSize(size as 9 | 13 | 19)}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    boardSize === size
                      ? 'bg-zinc-100 text-zinc-800 shadow-md'
                      : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
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
              className="w-full py-3 bg-zinc-100 text-zinc-800 rounded-lg font-semibold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
              {error}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="max-w-md mx-auto mt-16 text-center">
          <h3 className="text-xl font-semibold text-zinc-300 mb-4">
            How it works
          </h3>
          <div className="grid gap-6 md:grid-cols-2 text-left">
            <div className="bg-zinc-800/50 rounded-xl p-6">
              <div className="text-3xl mb-3 text-zinc-400">1</div>
              <h4 className="font-semibold text-zinc-100 mb-2">
                Create a board
              </h4>
              <p className="text-sm text-zinc-400">
                Choose your board size and create a new shared board.
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-6">
              <div className="text-3xl mb-3 text-zinc-400">2</div>
              <h4 className="font-semibold text-zinc-100 mb-2">
                Share & Play
              </h4>
              <p className="text-sm text-zinc-400">
                Send the Board URL to anyone and play like on a real board.
              </p>
            </div>
          </div>
        </div>

        {/* Zen Go Rules */}
        <div className="max-w-md mx-auto mt-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-300 mb-3">
            Zen Go Rules
          </h3>
          <ul className="text-xs text-zinc-400 space-y-1 text-left px-4">
            <li>• <strong className="text-zinc-200">3 Players</strong> - Player 1 → Player 2 → Player 3 → Player 1...</li>
            <li>• <strong className="text-zinc-200">Shared Pot</strong> - One pot with alternating black/white stones</li>
            <li>• <strong className="text-zinc-200">Stone Colors</strong> - First stone is Black, then White, Black...</li>
            <li>• <strong className="text-zinc-200">Capturing</strong> - Surround to capture, captures credited to you</li>
            <li>• <strong className="text-zinc-200">Ko Rule</strong> - No immediate recapture of single stones</li>
          </ul>
        </div>

        {/* Features */}
        <section className="max-w-md mx-auto mt-12 text-center">
          <h2 className="text-xl font-semibold text-zinc-300 mb-4">
            Why Play on Goban Web?
          </h2>
          <div className="bg-zinc-800/50 rounded-xl p-6">
            <ul className="text-sm text-zinc-400 space-y-2 text-left">
              <li>• <strong className="text-zinc-200">No login or signup</strong> - start playing in seconds</li>
              <li>• <strong className="text-zinc-200">Works on any device</strong> - iPad, Android tablet, iPhone, phone</li>
              <li>• <strong className="text-zinc-200">Play locally or remotely</strong> - share a link with friends</li>
              <li>• <strong className="text-zinc-200">Real board feel</strong> - pick up, place & move stones freely</li>
              <li>• <strong className="text-zinc-200">Real-time sync</strong> - all players see moves instantly</li>
              <li>• <strong className="text-zinc-200">Free forever</strong> - no ads, no premium features</li>
            </ul>
          </div>
        </section>

        {/* Back to Menu */}
        <div className="max-w-md mx-auto mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium hover:underline text-zinc-500 hover:text-zinc-300"
          >
            ← Back to Menu
          </button>
        </div>

      </div>
    </div>
  );
}
