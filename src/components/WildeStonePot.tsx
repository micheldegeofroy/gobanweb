'use client';

import { WILDE_COLORS } from '@/lib/wilde/colors';

// Adjust color hue
function adjustColorHue(hex: string, hueOffset: number): string {
  if (!hueOffset) return hex;

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

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

  h = (h + hueOffset / 360) % 1;
  if (h < 0) h += 1;

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
}

interface WildeStonePotProps {
  color: number; // 0-7
  potCount: number;    // Stones available in pot
  captured: number;    // Opponent stones captured (Japanese scoring)
  onBoard: number;     // Own stones on board (Chinese scoring)
  isHoldingStone: boolean;
  heldStoneColor: number | null;
  isCurrentTurn?: boolean;
  small?: boolean;
  customHue?: number;
  onClick: () => void;
}

export default function WildeStonePot({
  color,
  potCount,
  captured,
  onBoard,
  isHoldingStone,
  heldStoneColor,
  isCurrentTurn = false,
  small = false,
  customHue = 0,
  onClick,
}: WildeStonePotProps) {
  const colorInfo = WILDE_COLORS[color] || WILDE_COLORS[0];

  // Apply hue adjustment
  const mainColor = adjustColorHue(colorInfo.hex, customHue);
  const lightColor = adjustColorHue(colorInfo.light, customHue);
  const darkColor = adjustColorHue(colorInfo.dark, customHue);

  // Highlight if holding a stone of this color (can drop back)
  const isDropTarget = isHoldingStone && heldStoneColor === color;

  // Dimensions based on small prop
  const potSize = small ? 'w-16 h-16' : 'w-24 h-24';
  const stoneSize = small ? 'w-5 h-5' : 'w-8 h-8';
  const fontSize = small ? 'text-[10px]' : 'text-xs';

  return (
    <button
      onClick={onClick}
      className={`
        ${potSize} rounded-full
        flex flex-col items-center justify-center
        transition-all duration-200 shadow-lg
        ${isCurrentTurn ? 'ring-4 ring-white animate-pulse' : ''}
        ${isDropTarget ? 'scale-110 ring-4 ring-white' : ''}
        ${!isHoldingStone && potCount > 0 ? 'hover:scale-105 hover:brightness-110' : ''}
        ${potCount === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        backgroundColor: mainColor,
      }}
      disabled={!isDropTarget && (isHoldingStone || potCount === 0)}
      title={`${colorInfo.name}: ${potCount} in pot / ${captured} captured / ${onBoard} on board`}
    >
      {/* Stone preview */}
      <div
        className={`${stoneSize} rounded-full shadow-md mb-0.5`}
        style={{
          background: `linear-gradient(135deg, ${lightColor} 0%, ${darkColor} 100%)`,
        }}
      />
      {/* Stats: potCount / captured / onBoard */}
      <div
        className={`${fontSize} font-bold text-white text-center leading-tight`}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        <div>{potCount}</div>
        <div className="opacity-75">{captured}/{onBoard}</div>
      </div>
    </button>
  );
}
