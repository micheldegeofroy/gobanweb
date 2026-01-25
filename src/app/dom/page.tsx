'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DomGoHome() {
  const router = useRouter();
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(13);
  const [isCreating, setIsCreating] = useState(false);

  // Airbnb colors
  const airbnbRed = '#FF5A5F';
  const airbnbDark = '#484848';

  const createGame = async () => {
    setIsCreating(true);

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

      // Navigate to Dom game page with key in URL
      router.push(`/dom/${data.gameId}?key=${encodeURIComponent(data.privateKey)}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: airbnbRed }}>
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <img
            src="https://domiio.com/logo.png"
            alt="Domiio"
            className="h-20 mx-auto brightness-0 invert"
          />
        </header>

        <div className="max-w-md mx-auto">
          {/* Card with Airbnb style */}
          <div
            className="rounded-xl shadow-2xl p-8 border border-gray-100"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {/* Stone Preview */}
            <div className="flex justify-center gap-6 mb-8">
              <div
                className="w-12 h-12 rounded-full shadow-xl"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #FF8A8F 0%, #CC484C 100%)',
                  boxShadow: '2px 2px 4px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.2)'
                }}
                title="Red"
              />
              <div
                className="w-12 h-12 rounded-full shadow-xl"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #d0d0d0 100%)',
                  boxShadow: '2px 2px 4px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(0,0,0,0.1), inset 2px 2px 4px rgba(255,255,255,0.5)'
                }}
                title="White"
              />
            </div>

            {/* Board Size Buttons - Airbnb style */}
            <div className="flex gap-3 mb-6">
              {[9, 13, 19].map((size) => (
                <button
                  key={size}
                  onClick={() => setBoardSize(size as 9 | 13 | 19)}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                    boardSize === size
                      ? 'text-white shadow-md'
                      : 'bg-white border-2 hover:border-gray-400'
                  }`}
                  style={boardSize === size
                    ? { backgroundColor: airbnbRed }
                    : { borderColor: '#DDDDDD', color: airbnbDark }
                  }
                >
                  {size}×{size}
                </button>
              ))}
            </div>

            {/* Create Board Button - Airbnb style */}
            <button
              onClick={createGame}
              disabled={isCreating}
              className="w-full py-4 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: airbnbRed }}
            >
              {isCreating ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </div>

        {/* How it works - Airbnb style */}
        <div className="max-w-md mx-auto mt-16 text-center">
          <h3 className="text-xl font-semibold mb-6 text-white">
            How it works
          </h3>
          <div className="grid gap-6 md:grid-cols-2 text-left">
            <div className="bg-white rounded-xl p-6">
              <div className="text-3xl mb-3" style={{ color: airbnbRed }}>1</div>
              <h4 className="font-semibold mb-2" style={{ color: airbnbDark }}>
                Create a board
              </h4>
              <p className="text-sm text-gray-500">
                Choose your board size and create a new shared board.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6">
              <div className="text-3xl mb-3" style={{ color: airbnbRed }}>2</div>
              <h4 className="font-semibold mb-2" style={{ color: airbnbDark }}>
                Share & Play
              </h4>
              <p className="text-sm text-gray-500">
                Send the Board URL to anyone and play like on a real board.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <section className="max-w-md mx-auto mt-6 text-center">
          <div className="bg-white rounded-xl p-6">
            <ul className="text-sm text-gray-600 space-y-3 text-left">
              <li className="flex items-start gap-2">
                <span style={{ color: airbnbRed }}>✓</span>
                <span><strong>No login required</strong> - start playing in seconds</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: airbnbRed }}>✓</span>
                <span><strong>Works everywhere</strong> - iPad, tablet, phone, desktop</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: airbnbRed }}>✓</span>
                <span><strong>Real board feel</strong> - pick up, place & move stones</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: airbnbRed }}>✓</span>
                <span><strong>Real-time sync</strong> - all players see moves instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: airbnbRed }}>✓</span>
                <span><strong>Free forever</strong> - no ads, no premium features</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Back to home link */}
        <div className="max-w-md mx-auto mt-12 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium hover:underline text-white/80 hover:text-white"
          >
            ← Discover More Go Games
          </button>
        </div>

      </div>
    </div>
  );
}
