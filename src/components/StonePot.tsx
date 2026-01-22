'use client';

interface StonePotProps {
  color: 0 | 1; // 0 = black, 1 = white
  potCount: number; // Stones available in pot
  captured: number; // Opponent stones captured (Japanese scoring)
  onBoard: number; // Own stones on board (Chinese scoring)
  isHoldingStone: boolean;
  heldStoneColor: 0 | 1 | null;
  rotated?: boolean; // Rotate 180° for face-to-face play
  small?: boolean; // Use smaller size for mobile
  onClick: () => void;
  innerColor?: string; // Custom inner color for white pot (red inside with white rim)
  hideRing?: boolean; // Hide the brown ring around the pot
  stonePreviewColor?: string; // Custom color for the stone preview (e.g., red for Dom Go)
}

export default function StonePot({
  color,
  potCount,
  captured,
  onBoard,
  isHoldingStone,
  heldStoneColor,
  rotated = false,
  small = false,
  onClick,
  innerColor,
  hideRing = false,
  stonePreviewColor,
}: StonePotProps) {
  const isBlack = color === 0;
  const canPickUp = !isHoldingStone && potCount > 0;
  const canDropHere = isHoldingStone && heldStoneColor === color;

  // Custom style for pot with inner color
  const customPotStyle = innerColor ? {
    background: innerColor === '#FFFFFF' || innerColor === '#ffffff' || innerColor === 'white'
      // White bowl with subtle depth effect (gray center fading to white rim)
      ? `radial-gradient(circle, #e8e8e8 0%, #f0f0f0 40%, white 75%, white 100%)`
      // Colored bowl (e.g., red inside with white rim)
      : `radial-gradient(circle, ${innerColor} 0%, ${innerColor} 60%, white 85%, white 100%)`,
    border: '3px solid white',
  } : undefined;

  // 3D style for stone preview when custom color is set
  const getStonePreviewStyle = () => {
    if (!stonePreviewColor || !isBlack) return undefined;

    // Parse hex color and create lighter/darker versions for 3D effect
    const hex = stonePreviewColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Lighter for highlight (40% lighter)
    const lighterR = Math.min(255, Math.round(r + (255 - r) * 0.4));
    const lighterG = Math.min(255, Math.round(g + (255 - g) * 0.4));
    const lighterB = Math.min(255, Math.round(b + (255 - b) * 0.4));

    // Darker for shadow (20% darker)
    const darkerR = Math.round(r * 0.8);
    const darkerG = Math.round(g * 0.8);
    const darkerB = Math.round(b * 0.8);

    return {
      background: `radial-gradient(circle at 30% 30%, rgb(${lighterR}, ${lighterG}, ${lighterB}) 0%, rgb(${darkerR}, ${darkerG}, ${darkerB}) 100%)`,
    };
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-full
        flex flex-col items-center justify-center
        transition-all duration-200
        ${small ? 'w-16 h-16' : 'w-24 h-24'}
        ${innerColor
          ? ''
          : isBlack
            ? 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600'
            : 'bg-zinc-100 hover:bg-white active:bg-zinc-50 border-2 border-zinc-300'
        }
        ${(innerColor || hideRing) ? '' : 'ring-4 ring-[#8f6c00]'}
        ${canPickUp ? 'cursor-grab' : ''}
        ${canDropHere ? 'cursor-pointer' : ''}
        shadow-lg hover:shadow-xl
        ${rotated ? 'rotate-180' : ''}
      `}
      style={customPotStyle}
    >
      {/* Stone preview in pot */}
      <div
        className={`
          rounded-full mb-1
          ${small ? 'w-8 h-8' : 'w-12 h-12'}
          ${isBlack && stonePreviewColor
            ? ''
            : isBlack
              ? 'bg-gradient-to-br from-zinc-600 to-zinc-900'
              : 'bg-gradient-to-br from-white to-zinc-200 border border-zinc-300'
          }
          shadow-md
        `}
        style={getStonePreviewStyle()}
      />

      {/* Stats: potCount / captured / onBoard */}
      <div
        className={`
          font-bold text-center leading-tight
          ${small ? 'text-[10px]' : 'text-xs'}
          ${innerColor
            ? (innerColor === '#FFFFFF' || innerColor === '#ffffff' || innerColor === 'white' ? 'text-zinc-600' : 'text-white')
            : isBlack ? 'text-zinc-300' : 'text-zinc-600'}
        `}
      >
        <div className={small ? 'text-xs' : 'text-sm'}>{potCount}</div>
        <div className="opacity-75">{captured}/{onBoard}</div>
      </div>
    </button>
  );
}
