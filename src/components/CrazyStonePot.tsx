'use client';

interface CrazyStonePotProps {
  color: 0 | 1 | 2 | 3; // 0=black, 1=white, 2=white-cross, 3=black-cross
  count: number;
  returned: number;
  isHoldingStone: boolean;
  heldStoneColor: 0 | 1 | 2 | 3 | null;
  isCurrentTurn?: boolean;
  small?: boolean;
  onClick: () => void;
}

const colorStyles = {
  0: {
    bg: 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600',
    stone: 'bg-gradient-to-br from-zinc-600 to-zinc-900',
    border: '',
    text: 'text-zinc-300',
  },
  1: {
    bg: 'bg-zinc-100 hover:bg-white active:bg-zinc-50 border-2 border-zinc-300',
    stone: 'bg-gradient-to-br from-white to-zinc-200 border border-zinc-300',
    border: '',
    text: 'text-zinc-600',
  },
  2: {
    bg: 'bg-zinc-100 hover:bg-white active:bg-zinc-50 border-2 border-zinc-300',
    stone: 'bg-gradient-to-br from-white to-zinc-200 border border-zinc-300',
    border: '',
    text: 'text-zinc-600',
    hasCross: true,
  },
  3: {
    bg: 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600',
    stone: 'bg-gradient-to-br from-zinc-600 to-zinc-900',
    border: '',
    text: 'text-zinc-300',
    hasCross: true,
    crossColor: 'white',
  },
};

export default function CrazyStonePot({
  color,
  count,
  returned,
  isHoldingStone,
  heldStoneColor,
  isCurrentTurn = false,
  small = false,
  onClick,
}: CrazyStonePotProps) {
  const total = count + returned;
  const canPickUp = !isHoldingStone && total > 0 && isCurrentTurn;
  const canDropHere = isHoldingStone && heldStoneColor === color;
  const styles = colorStyles[color];

  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-full
        flex flex-col items-center justify-center
        transition-all duration-200
        ${small ? 'w-14 h-14' : 'w-20 h-20'}
        ${styles.bg}
        ${isCurrentTurn ? 'ring-4 ring-red-500' : 'ring-4 ring-[#8f6c00]'}
        ${canPickUp ? 'cursor-grab hover:ring-red-400 active:ring-red-600' : ''}
        ${canDropHere ? 'cursor-pointer ring-[#8f6c00] active:ring-[#8f6c00]' : ''}
        ${!canPickUp && !canDropHere ? 'cursor-default' : ''}
        shadow-lg hover:shadow-xl
      `}
      disabled={!canPickUp && !canDropHere}
    >
      <div
        className={`
          rounded-full mb-1 relative overflow-hidden
          ${small ? 'w-6 h-6' : 'w-10 h-10'}
          ${styles.stone}
          shadow-md
        `}
      >
        {color === 2 && (
          <>
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-zinc-900" />
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-900" />
          </>
        )}
        {color === 3 && (
          <>
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white" />
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white" />
          </>
        )}
      </div>
      <span className={`font-bold ${small ? 'text-xs' : 'text-sm'} ${styles.text}`}>
        {returned > 0 ? `${count}/${returned}` : count}
      </span>
    </button>
  );
}
