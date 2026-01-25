// Wild fantasy candy-shop colors for Wilde Go
export interface WildeColor {
  id: number;
  name: string;
  hex: string;
  light: string;
  dark: string;
  outline: string;
}

// 8 distinct wild fantasy colors
export const WILDE_COLORS: WildeColor[] = [
  { id: 0, name: 'Hot Pink',      hex: '#FF69B4', light: '#FFB6C1', dark: '#FF1493', outline: '#DB7093' },
  { id: 1, name: 'Electric Blue', hex: '#00BFFF', light: '#87CEEB', dark: '#0080FF', outline: '#4169E1' },
  { id: 2, name: 'Lime Green',    hex: '#32CD32', light: '#90EE90', dark: '#228B22', outline: '#006400' },
  { id: 3, name: 'Coral',         hex: '#FF7F50', light: '#FFA07A', dark: '#FF4500', outline: '#CD5C5C' },
  { id: 4, name: 'Purple',        hex: '#9370DB', light: '#DDA0DD', dark: '#8A2BE2', outline: '#4B0082' },
  { id: 5, name: 'Teal',          hex: '#20B2AA', light: '#48D1CC', dark: '#008B8B', outline: '#2F4F4F' },
  { id: 6, name: 'Orange',        hex: '#FF8C00', light: '#FFB84D', dark: '#CC7000', outline: '#B8860B' },
  { id: 7, name: 'Magenta',       hex: '#FF00FF', light: '#FF77FF', dark: '#CC00CC', outline: '#8B008B' },
];

// Tailwind-compatible styles for stone pots
export const WILDE_POT_STYLES: Record<number, { bg: string; stone: string; text: string; ring: string }> = {
  0: { bg: 'bg-pink-400 hover:bg-pink-300 active:bg-pink-500',       stone: 'bg-gradient-to-br from-pink-300 to-pink-600',     text: 'text-pink-900',    ring: 'ring-pink-500' },
  1: { bg: 'bg-sky-400 hover:bg-sky-300 active:bg-sky-500',          stone: 'bg-gradient-to-br from-sky-300 to-sky-600',       text: 'text-sky-900',     ring: 'ring-sky-500' },
  2: { bg: 'bg-lime-400 hover:bg-lime-300 active:bg-lime-500',       stone: 'bg-gradient-to-br from-lime-300 to-lime-600',     text: 'text-lime-900',    ring: 'ring-lime-500' },
  3: { bg: 'bg-orange-400 hover:bg-orange-300 active:bg-orange-500', stone: 'bg-gradient-to-br from-orange-300 to-orange-500', text: 'text-orange-900',  ring: 'ring-orange-500' },
  4: { bg: 'bg-purple-400 hover:bg-purple-300 active:bg-purple-500', stone: 'bg-gradient-to-br from-purple-300 to-purple-600', text: 'text-purple-900',  ring: 'ring-purple-500' },
  5: { bg: 'bg-teal-400 hover:bg-teal-300 active:bg-teal-500',       stone: 'bg-gradient-to-br from-teal-300 to-teal-600',     text: 'text-teal-900',    ring: 'ring-teal-500' },
  6: { bg: 'bg-amber-400 hover:bg-amber-300 active:bg-amber-500',    stone: 'bg-gradient-to-br from-amber-300 to-amber-600',   text: 'text-amber-900',   ring: 'ring-amber-500' },
  7: { bg: 'bg-fuchsia-400 hover:bg-fuchsia-300 active:bg-fuchsia-500', stone: 'bg-gradient-to-br from-fuchsia-300 to-fuchsia-600', text: 'text-fuchsia-900', ring: 'ring-fuchsia-500' },
};

// Calculate stone distribution for N players on WxH board
// Each player gets ALL intersections, starting player gets +1
export function calculateStoneCounts(width: number, height: number, playerCount: number): number[] {
  const totalIntersections = width * height;

  // All players get total intersections, player 0 (starter) gets +1
  return Array.from({ length: playerCount }, (_, i) =>
    totalIntersections + (i === 0 ? 1 : 0)
  );
}

// Create empty board
export function createEmptyBoard(width: number, height: number): (number | null)[][] {
  return Array(height).fill(null).map(() => Array(width).fill(null));
}

// Initialize stone pots for all players
// Structure: { potCount: available, captured: opponent stones taken, onBoard: own stones on board }
// Player 0 (starter) always gets +1
export function initializeStonePots(width: number, height: number, playerCount: number, stonesPerPlayer?: number | null) {
  if (stonesPerPlayer !== null && stonesPerPlayer !== undefined) {
    // Use custom stone count, starter gets +1
    return Array.from({ length: playerCount }, (_, i) => ({
      potCount: stonesPerPlayer + (i === 0 ? 1 : 0),
      captured: 0,
      onBoard: 0
    }));
  }
  // Auto-calculate based on board size
  const counts = calculateStoneCounts(width, height, playerCount);
  return counts.map(count => ({
    potCount: count,
    captured: 0,
    onBoard: 0
  }));
}
