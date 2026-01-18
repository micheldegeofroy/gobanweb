'use client';

interface ZenStonePotProps {
  potCount: number;
  nextStoneColor: 0 | 1; // 0=black, 1=white
  currentPlayerIndex: number; // 0, 1, or 2
  isHoldingStone: boolean;
  heldStoneColor: 0 | 1 | null;
  playerCaptures: [number, number, number]; // [player1, player2, player3]
  small?: boolean;
  onClick: () => void;
}

export default function ZenStonePot({
  potCount,
  nextStoneColor,
  currentPlayerIndex,
  isHoldingStone,
  heldStoneColor,
  playerCaptures,
  small = false,
  onClick,
}: ZenStonePotProps) {
  // Can only pick up if not holding and pot has stones
  const canPickUp = !isHoldingStone && potCount > 0;
  // Can drop stone back to pot if holding one
  const canDropHere = isHoldingStone && heldStoneColor !== null;
  // Is this a drop target (for visual feedback)
  const isDropTarget = canDropHere;

  // Grayscale styling based on next stone color
  const isBlack = nextStoneColor === 0;
  const bgClass = isBlack
    ? 'bg-zinc-800'
    : 'bg-zinc-100 border-2 border-zinc-400';
  const stoneClass = isBlack
    ? 'bg-gradient-to-br from-zinc-600 to-zinc-900'
    : 'bg-gradient-to-br from-white to-zinc-200 border border-zinc-300';
  const textClass = isBlack ? 'text-zinc-300' : 'text-zinc-600';

  // Player labels
  const playerLabel = `P${currentPlayerIndex + 1}`;
  const totalCaptures = playerCaptures[0] + playerCaptures[1] + playerCaptures[2];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Pot button */}
      <button
        onClick={onClick}
        className={`
          relative rounded-full
          flex flex-col items-center justify-center
          transition-all duration-200
          ${small ? 'w-16 h-16' : 'w-24 h-24'}
          ${bgClass}
          ring-4 ring-zinc-500 animate-pulse
          ${canPickUp ? 'cursor-grab hover:scale-105 hover:brightness-110 hover:ring-zinc-400 active:ring-zinc-300' : ''}
          ${isDropTarget ? 'cursor-pointer scale-110 ring-white' : ''}
          ${potCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          ${!canPickUp && !canDropHere && potCount > 0 ? 'cursor-default' : ''}
          shadow-lg hover:shadow-xl
        `}
        disabled={potCount === 0 && !canDropHere}
        title={`${isBlack ? 'Black' : 'White'} stone | ${potCount} in pot | Total captures: ${totalCaptures}`}
      >
        {/* Stone preview showing next color */}
        <div
          className={`
            rounded-full mb-1
            ${small ? 'w-7 h-7' : 'w-12 h-12'}
            ${stoneClass}
            shadow-md
          `}
        />
        {/* Stone count */}
        <span className={`font-bold ${small ? 'text-xs' : 'text-sm'} ${textClass}`}>
          {potCount}
        </span>
      </button>

      {/* Current player indicator */}
      <div className={`
        px-3 py-1 rounded-full
        ${small ? 'text-xs' : 'text-sm'}
        font-bold
        bg-zinc-700 text-zinc-100
        border-2 border-zinc-500
      `}>
        {playerLabel}&apos;s turn
      </div>

      {/* Next stone color label */}
      <div className={`
        ${small ? 'text-xs' : 'text-sm'}
        font-medium text-zinc-400
      `}>
        {isBlack ? 'Black' : 'White'}
      </div>

      {/* Player captures */}
      {!small && (
        <div className="flex gap-3 mt-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="font-bold text-zinc-100">P1:</span> {playerCaptures[0]}
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-zinc-100">P2:</span> {playerCaptures[1]}
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-zinc-100">P3:</span> {playerCaptures[2]}
          </span>
        </div>
      )}
    </div>
  );
}
