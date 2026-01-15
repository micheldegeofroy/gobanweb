'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { WILDE_COLORS } from '@/lib/wilde/colors';

type WildeStone = number | null; // 0-7 for players, null for empty
type WildeBoard = WildeStone[][];
type Position = { x: number; y: number };

export type WildeHeldStone = {
  color: number;
  fromBoard?: Position;
};

interface WildeGoBoardProps {
  board: WildeBoard;
  width: number;
  height: number;
  playerCount: number;
  heldStone: WildeHeldStone | null;
  lastMove: Position | null;
  onBoardClick: (pos: Position) => void;
  topButtons?: React.ReactNode;
}

// Get max board size based on screen dimensions
const getMaxBoardSize = () => {
  if (typeof window === 'undefined') return 600;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isLandscape = screenWidth > screenHeight;

  if (screenWidth >= 1024) {
    return 600;
  } else if (screenWidth >= 768) {
    if (isLandscape) {
      return Math.min(screenHeight - 200, screenWidth - 300, 700);
    }
    return Math.min(screenWidth - 40, screenHeight - 280, 700);
  } else {
    if (isLandscape) {
      return Math.min(screenHeight - 100, screenWidth - 200, 400);
    }
    return Math.min(screenWidth - 24, screenHeight - 260, 500);
  }
};

export default function WildeGoBoard({
  board,
  width,
  height,
  playerCount,
  heldStone,
  lastMove,
  onBoardClick,
  topButtons,
}: WildeGoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxSize, setMaxSize] = useState(600);
  const [hoverPos, setHoverPos] = useState<Position | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Calculate canvas dimensions for rectangular board
  const aspectRatio = width / height;
  let canvasWidth: number;
  let canvasHeight: number;
  if (aspectRatio >= 1) {
    canvasWidth = maxSize;
    canvasHeight = maxSize / aspectRatio;
  } else {
    canvasWidth = maxSize * aspectRatio;
    canvasHeight = maxSize;
  }

  const padding = Math.min(canvasWidth, canvasHeight) * 0.10;
  const boardPixelWidth = canvasWidth - padding * 2;
  const boardPixelHeight = canvasHeight - padding * 2;
  const cellSizeX = boardPixelWidth / (width - 1);
  const cellSizeY = boardPixelHeight / (height - 1);
  const cellSize = Math.min(cellSizeX, cellSizeY);

  // Convert canvas coordinates to board position
  const canvasToBoard = useCallback(
    (clientX: number, clientY: number): Position | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      const boardX = Math.round((x - padding) / cellSizeX);
      const boardY = Math.round((y - padding) / cellSizeY);

      if (boardX >= 0 && boardX < width && boardY >= 0 && boardY < height) {
        return { x: boardX, y: boardY };
      }
      return null;
    },
    [padding, cellSizeX, cellSizeY, width, height]
  );

  // Draw a single stone with 3D effect
  const drawStone = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: number,
    radius: number,
    isGhost: boolean = false
  ) => {
    if (isGhost) ctx.globalAlpha = 0.5;

    const colors = WILDE_COLORS[color] || WILDE_COLORS[0];

    // Shadow
    if (!isGhost) {
      ctx.beginPath();
      ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();
    }

    // Gradient fill
    const gradient = ctx.createRadialGradient(
      cx - radius * 0.3, cy - radius * 0.3, 0,
      cx, cy, radius
    );
    gradient.addColorStop(0, colors.light);
    gradient.addColorStop(1, colors.dark);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Outline
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (isGhost) ctx.globalAlpha = 1;
  }, []);

  // Get star points for rectangular boards
  const getStarPoints = useCallback((w: number, h: number): Position[] => {
    if (w < 7 || h < 7) return [];

    const getEdgeOffset = (size: number) => size >= 13 ? 3 : 2;
    const xOffset = getEdgeOffset(w);
    const yOffset = getEdgeOffset(h);

    const points: Position[] = [];
    const xPositions = [xOffset, Math.floor(w / 2), w - 1 - xOffset];
    const yPositions = [yOffset, Math.floor(h / 2), h - 1 - yOffset];

    // Only include unique positions
    const seen = new Set<string>();
    for (const x of xPositions) {
      for (const y of yPositions) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const key = `${x},${y}`;
          if (!seen.has(key)) {
            seen.add(key);
            points.push({ x, y });
          }
        }
      }
    }
    return points;
  }, []);

  // Draw the board
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Rainbow gradient background for wild mode!
    const bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    bgGradient.addColorStop(0, '#FFE4E1');   // Misty rose
    bgGradient.addColorStop(0.25, '#E6E6FA'); // Lavender
    bgGradient.addColorStop(0.5, '#E0FFFF');  // Light cyan
    bgGradient.addColorStop(0.75, '#F0FFF0'); // Honeydew
    bgGradient.addColorStop(1, '#FFF0F5');    // Lavender blush
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Fun sparkle overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 30; i++) {
      const sparkleX = (Math.sin(i * 7.3) * 0.5 + 0.5) * canvasWidth;
      const sparkleY = (Math.cos(i * 5.7) * 0.5 + 0.5) * canvasHeight;
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grid lines with rainbow colors
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i++) {
      const x = padding + i * cellSizeX;
      const hue = (i / width) * 360;
      ctx.strokeStyle = `hsla(${hue}, 50%, 50%, 0.6)`;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + (height - 1) * cellSizeY);
      ctx.stroke();
    }
    for (let i = 0; i < height; i++) {
      const y = padding + i * cellSizeY;
      const hue = (i / height) * 360;
      ctx.strokeStyle = `hsla(${hue}, 50%, 50%, 0.6)`;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + (width - 1) * cellSizeX, y);
      ctx.stroke();
    }

    // Star points with rainbow colors
    const starPoints = getStarPoints(width, height);
    for (let i = 0; i < starPoints.length; i++) {
      const point = starPoints[i];
      const hue = (i / starPoints.length) * 360;
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.beginPath();
      ctx.arc(
        padding + point.x * cellSizeX,
        padding + point.y * cellSizeY,
        cellSize * 0.12,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Draw stones
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const stone = board[y][x];
        if (stone !== null) {
          const isBeingHeld = heldStone?.fromBoard?.x === x && heldStone?.fromBoard?.y === y;
          if (!isBeingHeld) {
            const cx = padding + x * cellSizeX;
            const cy = padding + y * cellSizeY;
            drawStone(ctx, cx, cy, stone, cellSize * 0.45);
          }
        }
      }
    }

    // Last move indicator (rainbow ring)
    if (lastMove && board[lastMove.y][lastMove.x] !== null) {
      const cx = padding + lastMove.x * cellSizeX;
      const cy = padding + lastMove.y * cellSizeY;
      ctx.strokeStyle = '#FF1493'; // Deep pink
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ghost stone preview
    if (heldStone && hoverPos && board[hoverPos.y][hoverPos.x] === null) {
      const cx = padding + hoverPos.x * cellSizeX;
      const cy = padding + hoverPos.y * cellSizeY;
      drawStone(ctx, cx, cy, heldStone.color, cellSize * 0.45, true);
    }

    // Highlight stone under cursor
    if (!heldStone && hoverPos && board[hoverPos.y][hoverPos.x] !== null) {
      const cx = padding + hoverPos.x * cellSizeX;
      const cy = padding + hoverPos.y * cellSizeY;
      ctx.strokeStyle = '#FF69B4'; // Hot pink
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw held stone following cursor
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
  }, [board, width, height, canvasWidth, canvasHeight, heldStone, lastMove, hoverPos, mousePos, cellSize, cellSizeX, cellSizeY, padding, drawStone, getStarPoints]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const newMaxSize = getMaxBoardSize();
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setMaxSize(Math.min(containerWidth, newMaxSize));
      } else {
        setMaxSize(newMaxSize);
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

  // Redraw when state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = canvasToBoard(e.clientX, e.clientY);
      setHoverPos(pos);

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    [canvasToBoard]
  );

  // Handle click
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = canvasToBoard(e.clientX, e.clientY);
      if (pos) {
        onBoardClick(pos);
      }
    },
    [canvasToBoard, onBoardClick]
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = canvasToBoard(touch.clientX, touch.clientY);
      setHoverPos(pos);

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setMousePos({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        });
      }
    },
    [canvasToBoard]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = canvasToBoard(touch.clientX, touch.clientY);
      setHoverPos(pos);

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setMousePos({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        });
      }
    },
    [canvasToBoard]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (hoverPos) {
        onBoardClick(hoverPos);
      }
      setHoverPos(null);
      setMousePos(null);
    },
    [hoverPos, onBoardClick]
  );

  return (
    <div ref={containerRef} className="w-full mx-auto" style={{ maxWidth: canvasWidth }}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoverPos(null);
            setMousePos(null);
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            setHoverPos(null);
            setMousePos(null);
          }}
          className={`w-full h-auto rounded-lg shadow-lg ${
            heldStone ? 'cursor-none' : 'cursor-pointer'
          }`}
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
