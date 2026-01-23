'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BangGoHome() {
  const router = useRouter();
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(13);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Military camo colors
  const camoGreen = '#4B5320';
  const camoOlive = '#556B2F';
  const camoBrown = '#5C4033';
  const camoTan = '#C4A363';

  const createGame = async () => {
    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/bang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardSize }),
      });

      if (!res.ok) {
        throw new Error('Failed to create board');
      }

      const data = await res.json();

      // Store the private key in localStorage for this game
      localStorage.setItem(`bang_${data.gameId}_privateKey`, data.privateKey);

      // Navigate to Bang game page with key in URL
      router.push(`/bang/${data.gameId}?key=${encodeURIComponent(data.privateKey)}`);
    } catch (err) {
      setError('Failed to create board. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          linear-gradient(135deg, ${camoGreen} 0%, ${camoOlive} 25%, ${camoBrown} 50%, ${camoGreen} 75%, ${camoOlive} 100%),
          repeating-conic-gradient(from 0deg, ${camoGreen} 0deg 30deg, ${camoBrown} 30deg 60deg, ${camoOlive} 60deg 90deg)
        `,
        backgroundBlendMode: 'overlay'
      }}
    >
      {/* Camo pattern overlay */}
      <div
        className="min-h-screen"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 60% 40% at 20% 30%, ${camoOlive}80 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 80% 20%, ${camoBrown}80 0%, transparent 50%),
            radial-gradient(ellipse 70% 35% at 40% 70%, ${camoGreen}80 0%, transparent 50%),
            radial-gradient(ellipse 45% 55% at 70% 80%, ${camoOlive}80 0%, transparent 50%),
            radial-gradient(ellipse 55% 45% at 10% 60%, ${camoBrown}80 0%, transparent 50%)
          `
        }}
      >
        <div className="container mx-auto px-4 py-16">
          <header className="text-center mb-16">
            <h1
              className="text-5xl font-bold mb-4"
              style={{
                color: camoTan,
                textShadow: `2px 2px 4px ${camoBrown}, -1px -1px 0 ${camoGreen}`
              }}
            >
              Go Bang
            </h1>
            <p
              className="text-xl font-semibold"
              style={{ color: '#D2B48C' }}
            >
              Hidden Mines. Explosive Action.
            </p>
          </header>

          <div className="max-w-md mx-auto">
            {/* Card with camo border */}
            <div
              className="rounded-2xl shadow-2xl p-8 border-4"
              style={{
                backgroundColor: '#2D2D2D',
                borderColor: camoOlive
              }}
            >
              {/* Mine Warning */}
              <div
                className="text-center mb-6 py-2 rounded-lg"
                style={{ backgroundColor: camoBrown }}
              >
                <span className="text-2xl">💣</span>
                <span
                  className="ml-2 font-bold tracking-wider"
                  style={{ color: camoTan }}
                >
                  DANGER ZONE
                </span>
                <span className="ml-2 text-2xl">💥</span>
              </div>

              {/* Stone Preview */}
              <div className="flex justify-center gap-6 mb-8">
                <div
                  className="w-12 h-12 rounded-full shadow-xl"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, #333 0%, #000 100%)',
                    boxShadow: '2px 2px 4px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(100,100,100,0.2)'
                  }}
                  title="Black"
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

              {/* Board Size Buttons - Military style */}
              <div className="flex gap-3 mb-6">
                {[9, 13, 19].map((size) => (
                  <button
                    key={size}
                    onClick={() => setBoardSize(size as 9 | 13 | 19)}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all border-2 ${
                      boardSize === size
                        ? 'text-black shadow-md'
                        : 'hover:opacity-80'
                    }`}
                    style={boardSize === size
                      ? { backgroundColor: camoTan, borderColor: camoTan }
                      : { backgroundColor: 'transparent', borderColor: camoOlive, color: camoTan }
                    }
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>

              {/* Mine Count Info */}
              <div
                className="text-center text-sm mb-4 opacity-80"
                style={{ color: camoTan }}
              >
                {Math.floor(boardSize * boardSize * 0.1)} hidden mines ({boardSize}×{boardSize} board)
              </div>

              {/* Create Board Button - Military style */}
              <button
                onClick={createGame}
                disabled={isCreating}
                className="w-full py-4 rounded-lg font-bold text-black transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                style={{ backgroundColor: camoTan }}
              >
                {isCreating ? 'Deploying...' : 'Deploy Board'}
              </button>
            </div>
          </div>

          {error && (
            <div className="max-w-md mx-auto mt-6">
              <div
                className="px-4 py-3 rounded-lg text-center border-2"
                style={{
                  backgroundColor: '#4a1c1c',
                  borderColor: '#8b0000',
                  color: '#ffcccc'
                }}
              >
                {error}
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="max-w-md mx-auto mt-16 text-center">
            <h3
              className="text-xl font-semibold mb-6"
              style={{ color: camoTan }}
            >
              Mission Briefing
            </h3>
            <div className="grid gap-6 md:grid-cols-2 text-left">
              <div
                className="rounded-xl p-6 border-2"
                style={{
                  backgroundColor: '#2D2D2D80',
                  borderColor: camoOlive
                }}
              >
                <div className="text-3xl mb-3" style={{ color: camoTan }}>1</div>
                <h4 className="font-semibold mb-2" style={{ color: camoTan }}>
                  Deploy Board
                </h4>
                <p className="text-sm" style={{ color: '#999' }}>
                  Choose board size. Mines are placed randomly - 10% of intersections.
                </p>
              </div>
              <div
                className="rounded-xl p-6 border-2"
                style={{
                  backgroundColor: '#2D2D2D80',
                  borderColor: camoOlive
                }}
              >
                <div className="text-3xl mb-3" style={{ color: camoTan }}>2</div>
                <h4 className="font-semibold mb-2" style={{ color: camoTan }}>
                  Engage & Survive
                </h4>
                <p className="text-sm" style={{ color: '#999' }}>
                  Play Go normally, but one wrong move and BOOM - stones are destroyed!
                </p>
              </div>
            </div>
          </div>

          {/* Explosion Rules */}
          <div className="max-w-md mx-auto mt-12 text-center">
            <h3
              className="text-lg font-semibold mb-3"
              style={{ color: camoTan }}
            >
              Explosion Rules
            </h3>
            <ul
              className="text-xs space-y-1 text-left px-4"
              style={{ color: '#999' }}
            >
              <li>• <strong style={{ color: camoTan }}>Hidden Mines</strong> - 10% of board intersections contain invisible mines</li>
              <li>• <strong style={{ color: camoTan }}>Trigger</strong> - Place or move a stone onto a mine to trigger explosion</li>
              <li>• <strong style={{ color: camoTan }}>Blast Radius</strong> - Explosion destroys the trigger stone + all 8 adjacent stones</li>
              <li>• <strong style={{ color: camoTan }}>Casualties</strong> - Exploded stones are lost forever (not captured)</li>
              <li>• <strong style={{ color: camoTan }}>Standard Go</strong> - Normal capture rules still apply when no explosion</li>
            </ul>
          </div>

          {/* Features */}
          <section className="max-w-md mx-auto mt-12 text-center">
            <div
              className="rounded-xl p-6 border-2"
              style={{
                backgroundColor: '#2D2D2D80',
                borderColor: camoOlive
              }}
            >
              <ul
                className="text-sm space-y-3 text-left"
                style={{ color: '#999' }}
              >
                <li className="flex items-start gap-2">
                  <span style={{ color: camoTan }}>✓</span>
                  <span><strong style={{ color: camoTan }}>No login required</strong> - deploy in seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: camoTan }}>✓</span>
                  <span><strong style={{ color: camoTan }}>Works everywhere</strong> - any device, any platform</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: camoTan }}>✓</span>
                  <span><strong style={{ color: camoTan }}>Real-time sync</strong> - explosions sync instantly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: camoTan }}>✓</span>
                  <span><strong style={{ color: camoTan }}>Clear & reset</strong> - new random mines each time</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Back to home link */}
          <div className="max-w-md mx-auto mt-12 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm font-medium hover:underline"
              style={{ color: '#99998080' }}
            >
              ← Back to Classic Go
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
