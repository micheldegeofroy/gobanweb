'use client';

interface StonePotProps {
  color: 0 | 1; // 0 = black, 1 = white
  count: number; // Original stones remaining
  returned: number; // Stones returned from board
  isHoldingStone: boolean;
  heldStoneColor: 0 | 1 | null;
  rotated?: boolean; // Rotate 180° for face-to-face play
  small?: boolean; // Use smaller size for mobile
  onClick: () => void;
}

export default function StonePot({
  color,
  count,
  returned,
  isHoldingStone,
  heldStoneColor,
  rotated = false,
  small = false,
  onClick,
}: StonePotProps) {
  const isBlack = color === 0;
  const total = count + returned;
  const canPickUp = !isHoldingStone && total > 0;
  const canDropHere = isHoldingStone && heldStoneColor === color;

  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-full
        flex flex-col items-center justify-center
        transition-all duration-200
        ${small ? 'w-16 h-16' : 'w-24 h-24'}
        ${isBlack
          ? 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600'
          : 'bg-zinc-100 hover:bg-white active:bg-zinc-50 border-2 border-zinc-300'
        }
        ${canPickUp ? 'cursor-grab ring-4 ring-[#8f6c00]/50 hover:ring-[#8f6c00] active:ring-[#8f6c00]' : ''}
        ${canDropHere ? 'cursor-pointer ring-4 ring-[#8f6c00] active:ring-[#8f6c00]' : ''}
        ${!canPickUp && !canDropHere ? 'cursor-default opacity-60' : ''}
        shadow-lg hover:shadow-xl
        ${rotated ? 'rotate-180' : ''}
      `}
      disabled={!canPickUp && !canDropHere}
    >
      {/* Stone preview in pot */}
      <div
        className={`
          rounded-full mb-1
          ${small ? 'w-8 h-8' : 'w-12 h-12'}
          ${isBlack
            ? 'bg-gradient-to-br from-zinc-600 to-zinc-900'
            : 'bg-gradient-to-br from-white to-zinc-200 border border-zinc-300'
          }
          shadow-md
        `}
      />

      {/* Count: show "original/returned" if there are returned stones */}
      <span
        className={`
          font-bold
          ${small ? 'text-xs' : 'text-sm'}
          ${isBlack ? 'text-zinc-300' : 'text-zinc-600'}
        `}
      >
        {returned > 0 ? `${count}/${returned}` : count}
      </span>
    </button>
  );
}
