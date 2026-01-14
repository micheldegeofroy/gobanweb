'use client';

interface CrazyStonePotProps {
  color: 0 | 1 | 2 | 3; // 0=black, 1=white, 2=brown, 3=grey
  count: number;
  returned: number;
  isHoldingStone: boolean;
  heldStoneColor: 0 | 1 | 2 | 3 | null;
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
    bg: 'bg-amber-700 hover:bg-amber-600 active:bg-amber-500',
    stone: 'bg-gradient-to-br from-amber-500 to-amber-800',
    border: '',
    text: 'text-amber-100',
  },
  3: {
    bg: 'bg-red-600 hover:bg-red-500 active:bg-red-400',
    stone: 'bg-gradient-to-br from-red-400 to-red-700',
    border: '',
    text: 'text-red-100',
  },
};

export default function CrazyStonePot({
  color,
  count,
  returned,
  isHoldingStone,
  heldStoneColor,
  small = false,
  onClick,
}: CrazyStonePotProps) {
  const total = count + returned;
  const canPickUp = !isHoldingStone && total > 0;
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
        ${canPickUp ? 'cursor-grab ring-4 ring-purple-400/50 hover:ring-purple-400 active:ring-purple-500' : ''}
        ${canDropHere ? 'cursor-pointer ring-4 ring-purple-600 active:ring-purple-700' : ''}
        ${!canPickUp && !canDropHere ? 'cursor-default opacity-60' : ''}
        shadow-lg hover:shadow-xl
      `}
      disabled={!canPickUp && !canDropHere}
    >
      <div
        className={`
          rounded-full mb-1
          ${small ? 'w-6 h-6' : 'w-10 h-10'}
          ${styles.stone}
          shadow-md
        `}
      />
      <span className={`font-bold ${small ? 'text-xs' : 'text-sm'} ${styles.text}`}>
        {returned > 0 ? `${count}/${returned}` : count}
      </span>
    </button>
  );
}
