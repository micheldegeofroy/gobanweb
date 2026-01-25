'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { WILDE_COLORS } from '@/lib/wilde/colors';
import { Pakita, Direction } from '@/lib/wilde/pakita';

type WildeStone = number | null; // 0-7 for players, null for empty
type WildeBoard = WildeStone[][];
type Position = { x: number; y: number };

export type WildeHeldStone = {
  color: number;
  fromBoard?: Position;
};

interface PacmanState {
  x: number;
  y: number;
  direction: Direction;
  type: PacmanType;
}

interface WildeGoBoardProps {
  board: WildeBoard;
  width: number;
  height: number;
  playerCount: number;
  heldStone: WildeHeldStone | null;
  lastMove: Position | null;
  onBoardClick: (pos: Position) => void;
  topButtons?: React.ReactNode;
  pacman?: PacmanState | null;
  customHues?: Record<number, number> | null;
}

// Get max board dimensions based on screen size
const getMaxBoardDimensions = () => {
  if (typeof window === 'undefined') return { maxWidth: 600, maxHeight: 600 };

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  if (screenWidth >= 1024) {
    // Large screens - leave room for pots on sides
    return {
      maxWidth: screenWidth - 400,
      maxHeight: screenHeight - 100,
    };
  } else if (screenWidth >= 768) {
    return {
      maxWidth: screenWidth - 40,
      maxHeight: screenHeight - 200,
    };
  } else {
    return {
      maxWidth: screenWidth - 24,
      maxHeight: screenHeight - 200,
    };
  }
};

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

export default function WildeGoBoard({
  board,
  width,
  height,
  playerCount,
  heldStone,
  lastMove,
  onBoardClick,
  topButtons,
  pacman,
  customHues,
}: WildeGoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxDims, setMaxDims] = useState({ maxWidth: 600, maxHeight: 600 });
  const [hoverPos, setHoverPos] = useState<Position | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Calculate canvas dimensions for rectangular board with square cells
  // Board fills the available space while maintaining square cells
  const paddingRatio = 0.10;

  // Calculate cell size that fits within both width and height constraints
  const availableWidth = maxDims.maxWidth * (1 - paddingRatio * 2);
  const availableHeight = maxDims.maxHeight * (1 - paddingRatio * 2);

  const cellSizeByWidth = availableWidth / (width - 1);
  const cellSizeByHeight = availableHeight / (height - 1);
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);

  // Canvas dimensions based on grid size with square cells
  const boardPixelWidth = cellSize * (width - 1);
  const boardPixelHeight = cellSize * (height - 1);
  const padding = Math.max(boardPixelWidth, boardPixelHeight) * paddingRatio;
  const canvasWidth = boardPixelWidth + padding * 2;
  const canvasHeight = boardPixelHeight + padding * 2;

  const cellSizeX = cellSize;
  const cellSizeY = cellSize;

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

    const baseColors = WILDE_COLORS[color] || WILDE_COLORS[0];
    const hueOffset = customHues?.[color] || 0;

    // Apply hue adjustment if needed
    const colors = hueOffset ? {
      light: adjustColorHue(baseColors.light, hueOffset),
      dark: adjustColorHue(baseColors.dark, hueOffset),
      outline: adjustColorHue(baseColors.outline, hueOffset),
    } : baseColors;

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
  }, [customHues]);

  // Get star points for rectangular boards - symmetrical placement
  const getStarPoints = useCallback((w: number, h: number): Position[] => {
    if (w < 7 || h < 7) return [];

    const getEdgeOffset = (size: number) => size >= 13 ? 3 : 2;
    const xOffset = getEdgeOffset(w);
    const yOffset = getEdgeOffset(h);

    const points: Position[] = [];

    // For odd dimensions, include center. For even, only corners.
    const xIsOdd = w % 2 === 1;
    const yIsOdd = h % 2 === 1;

    const xPositions = xIsOdd
      ? [xOffset, Math.floor(w / 2), w - 1 - xOffset]
      : [xOffset, w - 1 - xOffset];
    const yPositions = yIsOdd
      ? [yOffset, Math.floor(h / 2), h - 1 - yOffset]
      : [yOffset, h - 1 - yOffset];

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
  }, [board, width, height, canvasWidth, canvasHeight, heldStone, hoverPos, mousePos, cellSize, cellSizeX, cellSizeY, padding, drawStone, getStarPoints]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const dims = getMaxBoardDimensions();
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setMaxDims({
          maxWidth: Math.min(containerWidth, dims.maxWidth),
          maxHeight: dims.maxHeight,
        });
      } else {
        setMaxDims(dims);
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

  // Calculate Pacman position in pixels (for overlay)
  const getPacmanPixelPos = () => {
    if (!pacman || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const canvasX = padding + pacman.x * cellSizeX;
    const canvasY = padding + pacman.y * cellSizeY;

    return {
      x: canvasX * scaleX,
      y: canvasY * scaleY,
      cellSize: cellSize * Math.min(scaleX, scaleY),
    };
  };

  const pacmanPixelPos = getPacmanPixelPos();

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
        {/* Buttons in top perimeter area - centered between grid edge and board edge */}
        {topButtons && (
          <div
            className="absolute flex items-center justify-between"
            style={{ top: '0%', left: '10%', right: '10%' }}
          >
            {topButtons}
          </div>
        )}
        {/* Pacman overlay */}
        {pacman && pacmanPixelPos && (
          <Pacman
            type={pacman.type}
            x={pacmanPixelPos.x}
            y={pacmanPixelPos.y}
            direction={pacman.direction}
            size={pacmanPixelPos.cellSize * 0.9}
          />
        )}
      </div>
    </div>
  );
}
