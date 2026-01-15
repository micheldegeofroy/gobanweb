'use client';

import { WILDE_COLORS, WILDE_POT_STYLES } from '@/lib/wilde/colors';

interface WildeStonePotProps {
  color: number; // 0-7
  count: number;
  returned: number;
  isHoldingStone: boolean;
  heldStoneColor: number | null;
  isCurrentTurn?: boolean;
  small?: boolean;
  onClick: () => void;
}

export default function WildeStonePot({
  color,
  count,
  returned,
  isHoldingStone,
  heldStoneColor,
  isCurrentTurn = false,
  small = false,
  onClick,
}: WildeStonePotProps) {
  const total = count + returned;
  const styles = WILDE_POT_STYLES[color] || WILDE_POT_STYLES[0];
  const colorInfo = WILDE_COLORS[color] || WILDE_COLORS[0];

  // Highlight if holding a stone of this color (can drop back)
  const isDropTarget = isHoldingStone && heldStoneColor === color;

  // Dimensions based on small prop
  const potSize = small ? 'w-14 h-14' : 'w-20 h-20';
  const stoneSize = small ? 'w-6 h-6' : 'w-10 h-10';
  const fontSize = small ? 'text-xs' : 'text-sm';

  return (
    <button
      onClick={onClick}
      className={`
        ${potSize} rounded-full ${styles.bg}
        flex flex-col items-center justify-center
        transition-all duration-200 shadow-lg
        ${isCurrentTurn ? `ring-4 ${styles.ring} animate-pulse` : ''}
        ${isDropTarget ? 'scale-110 ring-4 ring-white' : ''}
        ${!isHoldingStone && total > 0 ? 'hover:scale-105' : ''}
        ${total === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      disabled={!isDropTarget && (isHoldingStone || total === 0)}
      title={colorInfo.name}
    >
      {/* Stone preview */}
      <div className={`${stoneSize} rounded-full ${styles.stone} shadow-md mb-1`} />
      {/* Count */}
      <span className={`${fontSize} font-bold ${styles.text}`}>
        {total}
      </span>
    </button>
  );
}
