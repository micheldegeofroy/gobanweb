'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WILDE_COLORS } from '@/lib/wilde/colors';

export default function WildeGoHome() {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(4);
  const [boardWidth, setBoardWidth] = useState(13);
  const [boardHeight, setBoardHeight] = useState(13);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const createGame = async () => {
    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/wilde', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardWidth, boardHeight, playerCount }),
      });

      if (!res.ok) {
        throw new Error('Failed to create board');
      }

      const data = await res.json();

      // Store the private key in localStorage
      localStorage.setItem(`wilde_${data.gameId}_privateKey`, data.privateKey);

      // Navigate to game page with key in URL
      router.push(`/wilde/${data.gameId}?key=${encodeURIComponent(data.privateKey)}`);
    } catch (err) {
      setError('Failed to create board. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-4">
            Wilde Go
          </h1>
          <p className="text-xl text-purple-600 dark:text-purple-300">
            Go Extreme - Custom Boards, Up to 8 Players!
          </p>
        </header>

        <div className="max-w-md mx-auto">
          {/* Configuration Card */}
          <div
            className="rounded-2xl shadow-xl p-8 bg-gradient-to-br from-white/80 to-pink-50/80 dark:from-zinc-800/80 dark:to-purple-900/80 backdrop-blur-sm"
          >
            {/* Player Count */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">
                Players
              </label>
              <div className="flex gap-2 flex-wrap">
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPlayerCount(n)}
                    className={`w-10 h-10 rounded-full font-bold transition-all ${
                      playerCount === n
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-110'
                        : 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 hover:scale-105'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Preview */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">
                Player Colors
              </label>
              <div className="flex gap-2 flex-wrap">
                {WILDE_COLORS.slice(0, playerCount).map((color) => (
                  <div
                    key={color.id}
                    className="w-8 h-8 rounded-full shadow-md transition-transform hover:scale-110"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Board Width */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
                Board Width: {boardWidth}
              </label>
              <input
                type="range"
                min={3}
                max={20}
                value={boardWidth}
                onChange={(e) => setBoardWidth(Number(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <div className="flex justify-between text-xs text-purple-500 mt-1">
                <span>3</span>
                <span>20</span>
              </div>
            </div>

            {/* Board Height */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
                Board Height: {boardHeight}
              </label>
              <input
                type="range"
                min={3}
                max={20}
                value={boardHeight}
                onChange={(e) => setBoardHeight(Number(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-purple-500 mt-1">
                <span>3</span>
                <span>20</span>
              </div>
            </div>

            {/* Board Preview */}
            <div className="mb-6 text-center">
              <div
                className="inline-block border-4 border-purple-300 dark:border-purple-600 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 dark:from-purple-800 dark:to-pink-800"
                style={{
                  width: Math.min(boardWidth * 10, 200),
                  height: Math.min(boardHeight * 10, 200),
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-purple-500 dark:text-purple-300 text-xs font-bold">
                  {boardWidth}x{boardHeight}
                </div>
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={createGame}
              disabled={isCreating}
              className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isCreating ? 'Creating...' : 'Create Wild Board'}
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mt-6">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-center">
              {error}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="max-w-md mx-auto mt-12 text-center">
          <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">
            How it works
          </h3>
          <div className="grid gap-6 md:grid-cols-2 text-left">
            <div className="bg-white/50 dark:bg-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-3xl mb-3">1</div>
              <h4 className="font-semibold text-purple-800 dark:text-purple-100 mb-2">
                Configure your board
              </h4>
              <p className="text-sm text-purple-600 dark:text-purple-300">
                Choose 2-8 players and any board size from 3x3 to 20x20.
              </p>
            </div>
            <div className="bg-white/50 dark:bg-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-3xl mb-3">2</div>
              <h4 className="font-semibold text-purple-800 dark:text-purple-100 mb-2">
                Share & Play Wild
              </h4>
              <p className="text-sm text-purple-600 dark:text-purple-300">
                Send the Board URL to friends and let the chaos begin!
              </p>
            </div>
          </div>
        </div>

        {/* Wilde Go Info */}
        <div className="max-w-md mx-auto mt-12 text-center">
          <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">
            Wilde Go Rules
          </h3>
          <div className="bg-white/50 dark:bg-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
            <ul className="text-sm text-purple-600 dark:text-purple-300 space-y-2 text-left">
              <li>• <strong>2-8 Players</strong> - Each with their own wild color</li>
              <li>• <strong>Any Board Size</strong> - From tiny 3x3 to massive 20x20</li>
              <li>• <strong>Rectangular Boards</strong> - Mix it up with 7x15, 9x12, etc.</li>
              <li>• <strong>Same Go Rules</strong> - Capture by surrounding, no suicide</li>
              <li>• <strong>Free-for-all</strong> - Any stone can capture any other</li>
            </ul>
          </div>
        </div>

        {/* Features */}
        <section className="max-w-md mx-auto mt-12 text-center">
          <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">
            Why Play Wilde Go?
          </h2>
          <div className="bg-white/50 dark:bg-zinc-800/50 rounded-xl p-6 backdrop-blur-sm">
            <ul className="text-sm text-purple-600 dark:text-purple-300 space-y-2 text-left">
              <li>• <strong>Total chaos</strong> - 8 players battling it out</li>
              <li>• <strong>Wild colors</strong> - Hot pink, electric blue, lime green...</li>
              <li>• <strong>Custom boards</strong> - Any shape you can imagine</li>
              <li>• <strong>No login</strong> - Just create and share</li>
              <li>• <strong>Real-time sync</strong> - Everyone sees moves instantly</li>
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}
