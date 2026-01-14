'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(19);
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-zinc-800 dark:text-zinc-100 mb-4">
            Online Go Board
          </h1>
          {gameCount !== null && (
            <p className="text-lg text-amber-600 font-semibold mt-2">
              {gameCount} games played!
            </p>
          )}
        </header>

        <div className="max-w-md mx-auto">
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
                      ? 'bg-amber-600 text-white shadow-md'
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
              {isCreating ? 'Creating...' : 'Create Board'}
            </button>

            {/* Spacer */}
            <div style={{ height: '16px' }}></div>

            {/* Paste URL Input */}
            <input
              type="text"
              value={boardUrl}
              onChange={(e) => setBoardUrl(e.target.value)}
              placeholder="Paste Board URL"
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4 text-center"
              onKeyDown={(e) => e.key === 'Enter' && joinGame()}
            />

            {/* Join Board Button */}
            <button
              onClick={joinGame}
              disabled={isJoining}
              className="w-full py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Tutorial Link */}
        <section className="max-w-md mx-auto mt-12 text-center">
          <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            New to Go? Learn in 5 Minutes
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Go (also called Baduk or Weiqi) is one of the oldest board games. Our interactive tutorial teaches you the basics.
          </p>
          <button
            onClick={() => router.push('/tutorial')}
            className="px-6 py-3 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Start Free Tutorial
          </button>
        </section>
      </div>
    </div>
  );
}
