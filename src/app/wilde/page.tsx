'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WILDE_COLORS } from '@/lib/wilde/colors';

// Calculate default stones per player based on grid (each player gets all intersections)
function calculateDefaultStones(width: number, height: number, players: number): number {
  return width * height;
}

export default function WildeGoHome() {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(4);
  const [boardWidth, setBoardWidth] = useState(13);
  const [boardHeight, setBoardHeight] = useState(13);
  const [stonesPerPlayer, setStonesPerPlayer] = useState(() =>
    calculateDefaultStones(13, 13, 4)
  );
  const [hasManualOverride, setHasManualOverride] = useState(false);
  const [pakitaMode, setPakitaMode] = useState(false);
  const [customHues, setCustomHues] = useState<Record<number, number>>({}); // Player index -> hue offset
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Calculate the default stones value for display
  const defaultStones = calculateDefaultStones(boardWidth, boardHeight, playerCount);

  // Auto-update stones when grid or player count changes (unless manually overridden)
  useEffect(() => {
    if (!hasManualOverride) {
      setStonesPerPlayer(defaultStones);
    }
  }, [boardWidth, boardHeight, playerCount, defaultStones, hasManualOverride]);

  // Handle player count change
  const handlePlayerCountChange = (n: number) => {
    setPlayerCount(n);
    // Clear manual override when player count changes
    setHasManualOverride(false);
  };

  // Handle board width change
  const handleBoardWidthChange = (width: number) => {
    setBoardWidth(width);
    // Clear manual override when grid changes
    setHasManualOverride(false);
  };

  // Handle board height change
  const handleBoardHeightChange = (height: number) => {
    setBoardHeight(height);
    // Clear manual override when grid changes
    setHasManualOverride(false);
  };

  // Handle manual stones override
  const handleStonesChange = (stones: number) => {
    setStonesPerPlayer(stones);
    setHasManualOverride(true);
  };

  // Get adjusted color with hue shift
  const getAdjustedColor = (baseHex: string, hueOffset: number): string => {
    // Convert hex to HSL, shift hue, convert back
    const r = parseInt(baseHex.slice(1, 3), 16) / 255;
    const g = parseInt(baseHex.slice(3, 5), 16) / 255;
    const b = parseInt(baseHex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    // Apply hue offset
    h = (h + hueOffset / 360) % 1;
    if (h < 0) h += 1;

    // Convert back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const newR = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const newG = Math.round(hue2rgb(p, q, h) * 255);
    const newB = Math.round(hue2rgb(p, q, h - 1/3) * 255);

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const createGame = async () => {
    setIsCreating(true);

    try {
      const res = await fetch('/api/wilde', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardWidth, boardHeight, playerCount, stonesPerPlayer, pakitaMode, customHues }),
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
                    onClick={() => handlePlayerCountChange(n)}
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

            {/* Color Preview - Click to customize */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">
                Player Colors <span className="text-xs font-normal">(click to customize)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {WILDE_COLORS.slice(0, playerCount).map((color) => {
                  const hueOffset = customHues[color.id] || 0;
                  const displayColor = hueOffset ? getAdjustedColor(color.hex, hueOffset) : color.hex;
                  return (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColorIndex(selectedColorIndex === color.id ? null : color.id)}
                      className={`w-8 h-8 rounded-full shadow-md transition-all hover:scale-110 ${
                        selectedColorIndex === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-purple-500 scale-125' : ''
                      }`}
                      style={{ backgroundColor: displayColor }}
                      title={`${color.name} - Click to adjust hue`}
                    />
                  );
                })}
              </div>
              {/* Hue Slider */}
              {selectedColorIndex !== null && (
                <div className="mt-4 p-4 bg-white/50 dark:bg-zinc-700/50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-6 h-6 rounded-full shadow-md"
                      style={{
                        backgroundColor: getAdjustedColor(
                          WILDE_COLORS[selectedColorIndex].hex,
                          customHues[selectedColorIndex] || 0
                        )
                      }}
                    />
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      Hue: {customHues[selectedColorIndex] || 0}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={customHues[selectedColorIndex] || 0}
                    onChange={(e) => setCustomHues(prev => ({
                      ...prev,
                      [selectedColorIndex]: Number(e.target.value)
                    }))}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right,
                        hsl(0, 70%, 50%),
                        hsl(60, 70%, 50%),
                        hsl(120, 70%, 50%),
                        hsl(180, 70%, 50%),
                        hsl(240, 70%, 50%),
                        hsl(300, 70%, 50%),
                        hsl(360, 70%, 50%))`
                    }}
                  />
                  <button
                    onClick={() => {
                      setCustomHues(prev => {
                        const newHues = { ...prev };
                        delete newHues[selectedColorIndex];
                        return newHues;
                      });
                    }}
                    className="mt-2 text-xs text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-200"
                  >
                    Reset to default
                  </button>
                </div>
              )}
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
                onChange={(e) => handleBoardWidthChange(Number(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <div className="flex justify-between text-xs text-purple-500 mt-1">
                <span>3</span>
                <span>20</span>
              </div>
            </div>

            {/* Board Height */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
                Board Height: {boardHeight}
              </label>
              <input
                type="range"
                min={3}
                max={20}
                value={boardHeight}
                onChange={(e) => handleBoardHeightChange(Number(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-purple-500 mt-1">
                <span>3</span>
                <span>20</span>
              </div>
            </div>

            {/* Stones Per Player */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
                Stones Per Player: {stonesPerPlayer}
                {hasManualOverride && (
                  <span className="text-xs font-normal ml-2 text-pink-500">(custom)</span>
                )}
              </label>
              <input
                type="range"
                min={5}
                max={200}
                value={stonesPerPlayer}
                onChange={(e) => handleStonesChange(Number(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-purple-500 mt-1">
                <span>5</span>
                <span className="text-purple-400">default: {defaultStones}</span>
                <span>200</span>
              </div>
              {hasManualOverride && (
                <button
                  onClick={() => setHasManualOverride(false)}
                  className="mt-2 text-xs text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-200"
                >
                  Reset to default ({defaultStones})
                </button>
              )}
            </div>

            {/* Pakita Mode Toggle */}
            <div className="mb-6">
              <button
                onClick={() => setPakitaMode(!pakitaMode)}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-yellow-400 text-yellow-900 ${
                  pakitaMode
                    ? 'shadow-lg ring-2 ring-yellow-500'
                    : 'hover:bg-yellow-500'
                }`}
              >
                <img src="/pakita.png" alt="Pakita" className="w-8 h-8" />
                {/* Mini colored stones in front of Pakita's mouth */}
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EC6B9C' }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4FC3F7' }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7CB342' }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF8A65' }} />
                </div>
              </button>
              {pakitaMode && (
                <p className="text-xs text-pink-600 dark:text-pink-400 mt-2 text-center">
                  Pakita will randomly appear and eat stones!
                </p>
              )}
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

        {/* Back to Menu */}
        <div className="max-w-md mx-auto mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium hover:underline text-purple-400 hover:text-purple-200"
          >
            ← Back to Menu
          </button>
        </div>

      </div>
    </div>
  );
}
