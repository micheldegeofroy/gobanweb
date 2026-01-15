'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

type Stone = 0 | 1 | null;
type Board = Stone[][];
type Position = { x: number; y: number };

interface Highlight {
  positions: Position[];
  color: string;
}

interface CaptureAnimation {
  x: number;
  y: number;
  color: 0 | 1;
}

interface AppearAnimation {
  x: number;
  y: number;
  color: 0 | 1;
}

interface TutorialBoardProps {
  board: Board;
  size: number;
  lastMove?: Position | null;
  highlights?: Highlight[];
  showLiberties?: Position | null; // Show liberties for stone at this position
  crossMarkers?: Position[]; // Show crosses at these positions
  captureAnimation?: CaptureAnimation | null;
  appearAnimation?: AppearAnimation | null; // Stone that appears (triggers capture)
}

export default function TutorialBoard({
  board,
  size,
  lastMove = null,
  highlights = [],
  showLiberties = null,
  crossMarkers = [],
  captureAnimation = null,
  appearAnimation = null,
}: TutorialBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(300);
  const [captureOpacity, setCaptureOpacity] = useState(1);
  const [appearOpacity, setAppearOpacity] = useState(0);
  const animationRef = useRef<number | null>(null);

  const padding = canvasSize * 0.08;
  const boardWidth = canvasSize - padding * 2;
  const cellSize = boardWidth / (size - 1);

  // Draw a stone
  const drawStone = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: 0 | 1,
    radius: number,
    opacity: number = 1
  ) => {
    ctx.globalAlpha = opacity;

    const gradient = ctx.createRadialGradient(
      cx - radius * 0.3,
      cy - radius * 0.3,
      0,
      cx,
      cy,
      radius
    );

    if (color === 0) {
      gradient.addColorStop(0, '#4a4a4a');
      gradient.addColorStop(1, '#1a1a1a');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#d0d0d0');
    }

    // Shadow
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // Stone
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = color === 0 ? '#000000' : '#b0b0b0';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }, []);

  // Get all stones in a connected group
  const getGroup = useCallback((start: Position): Position[] => {
    const color = board[start.y][start.x];
    if (color === null) return [];

    const group: Position[] = [];
    const visited = new Set<string>();
    const queue: Position[] = [start];
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = `${pos.x},${pos.y}`;

      if (visited.has(key)) continue;
      if (pos.x < 0 || pos.x >= size || pos.y < 0 || pos.y >= size) continue;
      if (board[pos.y][pos.x] !== color) continue;

      visited.add(key);
      group.push(pos);

      for (const dir of directions) {
        queue.push({ x: pos.x + dir.x, y: pos.y + dir.y });
      }
    }

    return group;
  }, [board, size]);

  // Get liberties for the entire connected group containing the position
  const getLiberties = useCallback((pos: Position): Position[] => {
    const group = getGroup(pos);
    const liberties: Position[] = [];
    const seen = new Set<string>();
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const stone of group) {
      for (const dir of directions) {
        const nx = stone.x + dir.x;
        const ny = stone.y + dir.y;
        const key = `${nx},${ny}`;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === null && !seen.has(key)) {
          seen.add(key);
          liberties.push({ x: nx, y: ny });
        }
      }
    }

    return liberties;
  }, [board, size, getGroup]);

  // Draw the board
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Board background
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Wood grain
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvasSize; i += 8) {
      ctx.beginPath();
      ctx.moveTo(0, i + Math.random() * 4);
      ctx.lineTo(canvasSize, i + Math.random() * 4);
      ctx.stroke();
    }

    // Grid lines
    ctx.strokeStyle = '#3d2914';
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

    // Star points for 9x9
    if (size === 9) {
      const starPoints = [
        { x: 2, y: 2 }, { x: 6, y: 2 },
        { x: 4, y: 4 },
        { x: 2, y: 6 }, { x: 6, y: 6 },
      ];
      ctx.fillStyle = '#3d2914';
      for (const point of starPoints) {
        ctx.beginPath();
        ctx.arc(
          padding + point.x * cellSize,
          padding + point.y * cellSize,
          cellSize * 0.12,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    // Draw highlights (circles around positions)
    for (const highlight of highlights) {
      ctx.strokeStyle = highlight.color;
      ctx.lineWidth = 3;
      for (const pos of highlight.positions) {
        const cx = padding + pos.x * cellSize;
        const cy = padding + pos.y * cellSize;
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Show liberties if requested (as black crosses)
    if (showLiberties) {
      const liberties = getLiberties(showLiberties);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      const crossSize = cellSize * 0.25;
      for (const lib of liberties) {
        const cx = padding + lib.x * cellSize;
        const cy = padding + lib.y * cellSize;
        // Draw X cross
        ctx.beginPath();
        ctx.moveTo(cx - crossSize, cy - crossSize);
        ctx.lineTo(cx + crossSize, cy + crossSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + crossSize, cy - crossSize);
        ctx.lineTo(cx - crossSize, cy + crossSize);
        ctx.stroke();
      }
    }

    // Show cross markers at specific positions
    if (crossMarkers.length > 0) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      const crossSize = cellSize * 0.25;
      for (const pos of crossMarkers) {
        const cx = padding + pos.x * cellSize;
        const cy = padding + pos.y * cellSize;
        // Draw X cross
        ctx.beginPath();
        ctx.moveTo(cx - crossSize, cy - crossSize);
        ctx.lineTo(cx + crossSize, cy + crossSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + crossSize, cy - crossSize);
        ctx.lineTo(cx - crossSize, cy + crossSize);
        ctx.stroke();
      }
    }

    // Draw stones
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const stone = board[y][x];
        if (stone !== null) {
          const cx = padding + x * cellSize;
          const cy = padding + y * cellSize;
          drawStone(ctx, cx, cy, stone, cellSize * 0.45);
        }
      }
    }

    // Last move indicator
    if (lastMove && board[lastMove.y][lastMove.x] !== null) {
      const cx = padding + lastMove.x * cellSize;
      const cy = padding + lastMove.y * cellSize;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw appear animation (stone appearing)
    if (appearAnimation && appearOpacity > 0) {
      const cx = padding + appearAnimation.x * cellSize;
      const cy = padding + appearAnimation.y * cellSize;
      drawStone(ctx, cx, cy, appearAnimation.color, cellSize * 0.45, appearOpacity);
    }

    // Draw capture animation (fading stone)
    if (captureAnimation && captureOpacity > 0) {
      const cx = padding + captureAnimation.x * cellSize;
      const cy = padding + captureAnimation.y * cellSize;
      drawStone(ctx, cx, cy, captureAnimation.color, cellSize * 0.45, captureOpacity);
    }
  }, [board, size, canvasSize, lastMove, highlights, showLiberties, crossMarkers, cellSize, padding, drawStone, getLiberties, captureAnimation, captureOpacity, appearAnimation, appearOpacity]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setCanvasSize(width);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation loop for appear + capture sequence
  useEffect(() => {
    if (appearAnimation && captureAnimation) {
      // Simultaneous animation: black appears while white fades
      setAppearOpacity(0);
      setCaptureOpacity(1);
      let startTime: number | null = null;
      const animationDuration = 1500; // 1.5 seconds for both
      const pauseDuration = 800; // pause before restart
      const totalCycle = animationDuration + pauseDuration;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const cycleTime = elapsed % totalCycle;

        if (cycleTime < animationDuration) {
          // Black appears while white fades simultaneously
          const progress = cycleTime / animationDuration;
          setAppearOpacity(progress);
          setCaptureOpacity(1 - progress);
        } else {
          // Pause, reset for next cycle
          setAppearOpacity(0);
          setCaptureOpacity(1);
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else if (captureAnimation) {
      // Only capture animation (original behavior)
      setCaptureOpacity(1);
      let startTime: number | null = null;
      const duration = 1500;
      const pauseDuration = 500;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const totalCycle = duration + pauseDuration;
        const cycleTime = elapsed % totalCycle;

        if (cycleTime < duration) {
          const progress = cycleTime / duration;
          setCaptureOpacity(1 - progress);
        } else {
          setCaptureOpacity(1);
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else {
      setCaptureOpacity(1);
      setAppearOpacity(0);
    }
  }, [captureAnimation, appearAnimation]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full mx-auto">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="w-full h-auto rounded-lg shadow-lg"
      />
    </div>
  );
}
