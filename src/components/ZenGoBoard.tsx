'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

type ZenStone = 0 | 1 | null; // 0=black, 1=white
type ZenBoard = ZenStone[][];
type Position = { x: number; y: number };

export type ZenHeldStone = {
  color: 0 | 1;
  fromBoard?: Position;
};

interface ZenGoBoardProps {
  board: ZenBoard;
  size: number;
  heldStone: ZenHeldStone | null;
  lastMove: Position | null;
  onBoardClick: (pos: Position) => void;
  topButtons?: React.ReactNode;
}

const getMaxBoardSize = () => {
  if (typeof window === 'undefined') return 600;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;

  if (width >= 1024) return 600;
  else if (width >= 768) {
    if (isLandscape) return Math.min(height - 200, width - 300, 700);
    return Math.min(width - 40, height - 280, 700);
  } else {
    if (isLandscape) return Math.min(height - 100, width - 200, 400);
    return Math.min(width - 24, height - 260, 500);
  }
};

// Grayscale stone colors
const stoneColors = {
  0: { light: '#4a4a4a', dark: '#1a1a1a', outline: '#000000' }, // Black
  1: { light: '#ffffff', dark: '#d0d0d0', outline: '#b0b0b0' }, // White
};

export default function ZenGoBoard({
  board,
  size,
  heldStone,
  lastMove,
  onBoardClick,
  topButtons,
}: ZenGoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(600);
  const [hoverPos, setHoverPos] = useState<Position | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const padding = canvasSize * 0.13;
  const boardWidth = canvasSize - padding * 2;
  const cellSize = boardWidth / (size - 1);

  const canvasToBoard = useCallback(
    (clientX: number, clientY: number): Position | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      const boardX = Math.round((x - padding) / cellSize);
      const boardY = Math.round((y - padding) / cellSize);

      if (boardX >= 0 && boardX < size && boardY >= 0 && boardY < size) {
        return { x: boardX, y: boardY };
      }
      return null;
    },
    [padding, cellSize, size]
  );

  const drawStone = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: 0 | 1,
    radius: number,
    isGhost: boolean = false
  ) => {
    if (isGhost) ctx.globalAlpha = 0.5;

    const colors = stoneColors[color];
    const gradient = ctx.createRadialGradient(
      cx - radius * 0.3, cy - radius * 0.3, 0,
      cx, cy, radius
    );
    gradient.addColorStop(0, colors.light);
    gradient.addColorStop(1, colors.dark);

    if (!isGhost) {
      ctx.beginPath();
      ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    if (isGhost) ctx.globalAlpha = 1;
  }, []);

  const getStarPoints = useCallback((size: number): Position[] => {
    if (size === 19) {
      return [
        { x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 },
        { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 },
        { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 },
      ];
    } else if (size === 13) {
      return [
        { x: 3, y: 3 }, { x: 9, y: 3 },
        { x: 6, y: 6 },
        { x: 3, y: 9 }, { x: 9, y: 9 },
      ];
    } else if (size === 9) {
      return [
        { x: 2, y: 2 }, { x: 6, y: 2 },
        { x: 4, y: 4 },
        { x: 2, y: 6 }, { x: 6, y: 6 },
      ];
    }
    return [];
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Grayscale board background - dark wood grain
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Wood grain in grayscale
    ctx.strokeStyle = 'rgba(60, 60, 60, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvasSize; i += 8) {
      ctx.beginPath();
      ctx.moveTo(0, i + Math.random() * 4);
      ctx.lineTo(canvasSize, i + Math.random() * 4);
      ctx.stroke();
    }

    // Grid lines - lighter gray
    ctx.strokeStyle = '#7a7a7a';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i++) {
      const pos = padding + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(pos, padding);
      ctx.lineTo(pos, padding + (size - 1) * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, pos);
      ctx.lineTo(padding + (size - 1) * cellSize, pos);
      ctx.stroke();
    }

    // Star points - white/light gray
    const starPoints = getStarPoints(size);
    ctx.fillStyle = '#9a9a9a';
    for (const point of starPoints) {
      ctx.beginPath();
      ctx.arc(padding + point.x * cellSize, padding + point.y * cellSize, cellSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw coordinate numbers at top edge (size, size-1, ... 1) - rotated for opponent
    ctx.fillStyle = '#9a9a9a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < size; i++) {
      const x = padding + i * cellSize;
      const y = padding - cellSize * 0.4;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI);
      ctx.fillText(String(size - i), 0, 0);
      ctx.restore();
    }

    // Draw coordinate numbers at bottom edge (size, size-1, ... 1)
    ctx.textBaseline = 'top';
    for (let i = 0; i < size; i++) {
      const x = padding + i * cellSize;
      const y = padding + (size - 1) * cellSize + cellSize * 0.4;
      ctx.fillText(String(size - i), x, y);
    }

    // Draw coordinate letters on left edge (A, B, C...)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < size; i++) {
      const x = padding - cellSize * 0.4;
      const y = padding + i * cellSize;
      ctx.fillText(String.fromCharCode(65 + i), x, y);
    }

    // Draw coordinate letters on right edge (A, B, C...) - rotated for opponent
    ctx.textAlign = 'right';
    for (let i = 0; i < size; i++) {
      const x = padding + (size - 1) * cellSize + cellSize * 0.4;
      const y = padding + i * cellSize;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI);
      ctx.fillText(String.fromCharCode(65 + i), 0, 0);
      ctx.restore();
    }

    // Draw stones
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const stone = board[y][x];
        if (stone !== null) {
          const isBeingHeld = heldStone?.fromBoard?.x === x && heldStone?.fromBoard?.y === y;
          if (!isBeingHeld) {
            const cx = padding + x * cellSize;
            const cy = padding + y * cellSize;
            drawStone(ctx, cx, cy, stone, cellSize * 0.45);
          }
        }
      }
    }

    // Ghost stone preview
    if (heldStone && hoverPos && board[hoverPos.y][hoverPos.x] === null) {
      const cx = padding + hoverPos.x * cellSize;
      const cy = padding + hoverPos.y * cellSize;
      drawStone(ctx, cx, cy, heldStone.color, cellSize * 0.45, true);
    }

    // Highlight stone under cursor
    if (!heldStone && hoverPos && board[hoverPos.y][hoverPos.x] !== null) {
      const cx = padding + hoverPos.x * cellSize;
      const cy = padding + hoverPos.y * cellSize;
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw held stone at cursor
    if (heldStone && mousePos) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cx = mousePos.x * scaleX;
        const cy = mousePos.y * scaleY;
        drawStone(ctx, cx, cy, heldStone.color, cellSize * 0.45);
      }
    }
  }, [board, size, canvasSize, heldStone, lastMove, hoverPos, mousePos, cellSize, padding, drawStone, getStarPoints]);

  useEffect(() => {
    const handleResize = () => {
      const maxSize = getMaxBoardSize();
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setCanvasSize(Math.min(containerWidth, maxSize));
      } else {
        setCanvasSize(maxSize);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = canvasToBoard(e.clientX, e.clientY);
    setHoverPos(pos);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, [canvasToBoard]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = canvasToBoard(e.clientX, e.clientY);
    if (pos) onBoardClick(pos);
  }, [canvasToBoard, onBoardClick]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = canvasToBoard(touch.clientX, touch.clientY);
    setHoverPos(pos);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    }
  }, [canvasToBoard]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = canvasToBoard(touch.clientX, touch.clientY);
    setHoverPos(pos);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    }
  }, [canvasToBoard]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (hoverPos) onBoardClick(hoverPos);
    setHoverPos(null);
    setMousePos(null);
  }, [hoverPos, onBoardClick]);

  return (
    <div ref={containerRef} className="w-full mx-auto" style={{ maxWidth: canvasSize }}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setHoverPos(null); setMousePos(null); }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => { setHoverPos(null); setMousePos(null); }}
          className={`w-full h-auto rounded-lg shadow-lg ${heldStone ? 'cursor-none' : 'cursor-pointer'}`}
          style={{ touchAction: 'none' }}
        />
        {/* Buttons in top perimeter area */}
        {topButtons && (
          <div
            className="absolute flex items-center justify-between"
            style={{ top: '1%', left: '10%', right: '10%' }}
          >
            {topButtons}
          </div>
        )}
      </div>
    </div>
  );
}
