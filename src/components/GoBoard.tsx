'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { Board, Position } from '@/lib/game/logic';

export type HeldStone = {
  color: 0 | 1;
  fromBoard?: Position; // If picked up from board, store original position
};

interface GoBoardProps {
  board: Board;
  size: number;
  heldStone: HeldStone | null;
  lastMove: Position | null;
  onBoardClick: (pos: Position) => void;
  topButtons?: React.ReactNode;
  bottomButtons?: React.ReactNode;
  boardColor?: string; // Custom board background color
  whiteStoneColor?: string; // Custom color for white stones
  whiteStoneGlow?: string; // Custom glow color for white stones
  blackStoneColor?: string; // Custom color for black stones
  blackStoneGlow?: string; // Custom glow color for black stones
  blackStoneFlag?: 'russia'; // Draw black stones with flag pattern
  whiteStoneFlag?: 'ukraine'; // Draw white stones with flag pattern
  starPointColor?: string; // Custom color for star points (hoshi)
  whiteStoneMarker?: string; // Custom color for last move marker on white stones
  hideCoordinates?: boolean; // Hide coordinate labels around the board
  hideLastMoveMarker?: boolean; // Hide the last move marker ring
  hideHoverRing?: boolean; // Hide the red hover ring when hovering over stones
  explosionPositions?: Position[]; // Positions to show explosion markers (for Go Bang)
  droneAnimation?: {
    path: Position[]; // Path of grid positions the drone follows
    progress: number; // 0-1 animation progress
    propRotation: number; // Propeller rotation angle in radians
    targetHit: boolean; // Whether drone will hit a target
  } | null;
}

// Get max board size based on screen dimensions
const getMaxBoardSize = () => {
  if (typeof window === 'undefined') return 600;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;

  // For tablets in landscape, use more of the height
  // For phones in portrait, use most of the width
  // Leave room for header, bowls, and padding

  if (width >= 1024) {
    // Desktop - max 600px
    return 600;
  } else if (width >= 768) {
    // Tablet - maximize board size for easier play
    if (isLandscape) {
      return Math.min(height - 80, width - 100, 1100);
    }
    return Math.min(width - 16, height - 140, 1100);
  } else {
    // Phone
    if (isLandscape) {
      return Math.min(height - 100, width - 200, 400);
    }
    return Math.min(width - 24, height - 260, 500);
  }
};

export default function GoBoard({
  board,
  size,
  heldStone,
  lastMove,
  onBoardClick,
  topButtons,
  bottomButtons,
  boardColor = '#DEB887', // Default: Burlywood - traditional Go board color
  whiteStoneColor, // Optional custom color for white stones
  whiteStoneGlow, // Optional glow color for white stones
  blackStoneColor, // Optional custom color for black stones
  blackStoneGlow, // Optional glow color for black stones
  blackStoneFlag, // Optional flag pattern for black stones
  whiteStoneFlag, // Optional flag pattern for white stones
  starPointColor = '#3d2914', // Default: dark brown for star points
  whiteStoneMarker, // Optional custom color for last move marker on white stones
  hideCoordinates = false, // Hide coordinate labels around the board
  hideLastMoveMarker = false, // Hide the last move marker ring
  hideHoverRing = false, // Hide the red hover ring when hovering over stones
  explosionPositions = [], // Positions to show explosion markers (for Go Bang)
  droneAnimation, // Drone animation data (path, progress, rotation)
}: GoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(600);
  const [hoverPos, setHoverPos] = useState<Position | null>(null);

  // Calculate cell size based on canvas size
  const padding = canvasSize * (hideCoordinates ? 0.09 : 0.13);
  const boardWidth = canvasSize - padding * 2;
  const cellSize = boardWidth / (size - 1);

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

      const boardX = Math.round((x - padding) / cellSize);
      const boardY = Math.round((y - padding) / cellSize);

      if (boardX >= 0 && boardX < size && boardY >= 0 && boardY < size) {
        return { x: boardX, y: boardY };
      }
      return null;
    },
    [padding, cellSize, size]
  );

  // Draw a single stone with 3D effect
  const drawStone = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: 0 | 1,
    radius: number,
    isGhost: boolean = false
  ) => {
    if (isGhost) {
      ctx.globalAlpha = 0.5;
    }

    // Draw glow for white stones if whiteStoneGlow is set
    if (color === 1 && whiteStoneGlow && !isGhost) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = whiteStoneGlow;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw glow for black stones if blackStoneGlow is set
    if (color === 0 && blackStoneGlow && !isGhost) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = blackStoneGlow;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Create gradient for 3D effect
    const gradient = ctx.createRadialGradient(
      cx - radius * 0.3,
      cy - radius * 0.3,
      0,
      cx,
      cy,
      radius
    );

    if (color === 0) {
      // Black stone (or custom color)
      if (blackStoneColor) {
        // Create 3D effect: lighter highlight on top-left, original color for shadow
        // Parse hex color and create lighter version for highlight
        const hex = blackStoneColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Lighten by blending with white (40% lighter)
        const lighterR = Math.min(255, Math.round(r + (255 - r) * 0.4));
        const lighterG = Math.min(255, Math.round(g + (255 - g) * 0.4));
        const lighterB = Math.min(255, Math.round(b + (255 - b) * 0.4));
        const lighterColor = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
        // Darken for shadow edge (20% darker)
        const darkerR = Math.round(r * 0.8);
        const darkerG = Math.round(g * 0.8);
        const darkerB = Math.round(b * 0.8);
        const darkerColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
        gradient.addColorStop(0, lighterColor);
        gradient.addColorStop(1, darkerColor);
      } else {
        gradient.addColorStop(0, '#4a4a4a');
        gradient.addColorStop(1, '#1a1a1a');
      }
    } else {
      // White stone (or custom color)
      if (whiteStoneColor) {
        // Create 3D effect: lighter highlight on top-left, original color for shadow
        const hex = whiteStoneColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Lighten by blending with white (40% lighter)
        const lighterR = Math.min(255, Math.round(r + (255 - r) * 0.4));
        const lighterG = Math.min(255, Math.round(g + (255 - g) * 0.4));
        const lighterB = Math.min(255, Math.round(b + (255 - b) * 0.4));
        const lighterColor = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
        // Darken for shadow edge (20% darker)
        const darkerR = Math.round(r * 0.8);
        const darkerG = Math.round(g * 0.8);
        const darkerB = Math.round(b * 0.8);
        const darkerColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
        gradient.addColorStop(0, lighterColor);
        gradient.addColorStop(1, darkerColor);
      } else {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#d0d0d0');
      }
    }

    // Draw shadow
    if (!isGhost) {
      ctx.beginPath();
      ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();
    }

    // Draw stone - check for flag pattern
    if (color === 0 && blackStoneFlag === 'russia') {
      // Draw Russian flag pattern (white, blue, red horizontal stripes)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const stripeHeight = (radius * 2) / 3;
      const topY = cy - radius;

      // White stripe (top)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - radius, topY, radius * 2, stripeHeight);

      // Blue stripe (middle)
      ctx.fillStyle = '#0039A6';
      ctx.fillRect(cx - radius, topY + stripeHeight, radius * 2, stripeHeight);

      // Red stripe (bottom)
      ctx.fillStyle = '#D52B1E';
      ctx.fillRect(cx - radius, topY + stripeHeight * 2, radius * 2, stripeHeight);

      ctx.restore();

      // Add outline
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (color === 1 && whiteStoneFlag === 'ukraine') {
      // Draw Ukrainian flag pattern (blue top, yellow bottom - 2 horizontal stripes)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const stripeHeight = radius; // Each stripe is half the stone
      const topY = cy - radius;

      // Blue stripe (top)
      ctx.fillStyle = '#005BBB';
      ctx.fillRect(cx - radius, topY, radius * 2, stripeHeight);

      // Yellow stripe (bottom)
      ctx.fillStyle = '#FFD500';
      ctx.fillRect(cx - radius, topY + stripeHeight, radius * 2, stripeHeight);

      ctx.restore();

      // Add outline
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Normal stone drawing
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add subtle outline
      ctx.strokeStyle = color === 0 ? '#000000' : '#b0b0b0';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    if (isGhost) {
      ctx.globalAlpha = 1;
    }
  }, [whiteStoneColor, whiteStoneGlow, blackStoneColor, blackStoneGlow, blackStoneFlag, whiteStoneFlag]);

  // Get star points based on board size
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

  // Draw the board
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = boardColor;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw wood grain texture (only for wood-colored boards)
    if (boardColor === '#DEB887') {
      ctx.strokeStyle = 'rgba(139, 90, 43, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvasSize; i += 8) {
        ctx.beginPath();
        ctx.moveTo(0, i + Math.random() * 4);
        ctx.lineTo(canvasSize, i + Math.random() * 4);
        ctx.stroke();
      }
    }

    // Draw grid lines
    ctx.strokeStyle = '#3d2914';
    ctx.lineWidth = 1;

    for (let i = 0; i < size; i++) {
      const pos = padding + i * cellSize;

      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(pos, padding);
      ctx.lineTo(pos, padding + (size - 1) * cellSize);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(padding, pos);
      ctx.lineTo(padding + (size - 1) * cellSize, pos);
      ctx.stroke();
    }

    // Draw star points (hoshi)
    const starPoints = getStarPoints(size);
    ctx.fillStyle = starPointColor;
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

    // Draw coordinate labels if not hidden
    if (!hideCoordinates) {
      // Draw coordinate numbers at top edge (size, size-1, ... 1) - rotated for opponent
      ctx.fillStyle = '#3d2914';
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
    }

    // Draw stones on board
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const stone = board[y][x];
        if (stone !== null) {
          // If this stone is being held (picked up from board), show it faded
          const isBeingHeld = heldStone?.fromBoard?.x === x && heldStone?.fromBoard?.y === y;
          if (!isBeingHeld) {
            const cx = padding + x * cellSize;
            const cy = padding + y * cellSize;
            drawStone(ctx, cx, cy, stone, cellSize * 0.45);
          }
        }
      }
    }

    // Draw contrasting circle around last placed stone (white on black, black on white)
    if (!hideLastMoveMarker && lastMove && board[lastMove.y][lastMove.x] !== null) {
      const cx = padding + lastMove.x * cellSize;
      const cy = padding + lastMove.y * cellSize;
      const stoneColor = board[lastMove.y][lastMove.x];
      const isBlackStone = Number(stoneColor) === 0;
      ctx.strokeStyle = isBlackStone ? '#ffffff' : (whiteStoneMarker || '#000000');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw explosion markers for Go Bang - 9-point asymmetric starburst at 50% size
    for (const explosionPos of explosionPositions) {
      const cx = padding + explosionPos.x * cellSize;
      const cy = padding + explosionPos.y * cellSize;
      const r = cellSize * 0.5;
      const s = 0.75; // 75% size to cover stone edges

      ctx.save();
      ctx.translate(cx, cy);

      // Helper function to draw sharp starburst
      const drawStar = (outerR: number, innerR: number, points: number) => {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI / points) - Math.PI / 2;
          if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
      };

      // Helper for asymmetric starburst - varying point lengths
      const drawAsymmetricStar = (baseR: number, innerR: number, points: number, variance: number[]) => {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const pointIndex = Math.floor(i / 2);
          const v = variance[pointIndex % variance.length];
          const radius = i % 2 === 0 ? baseR * v : innerR;
          const angle = (i * Math.PI / points) - Math.PI / 2;
          if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
      };

      // Asymmetric variance pattern
      const vOuter = [1.2, 0.8, 1.0, 0.75, 1.15, 0.85, 1.1, 0.7, 0.95];
      const vInner = [1.1, 0.85, 1.0, 0.9, 1.05, 0.8, 1.0, 0.85, 0.95];

      // Outer red layer
      drawAsymmetricStar(r * 2.4 * s, r * 1.1 * s, 9, vOuter);
      ctx.fillStyle = '#D52B1E';
      ctx.fill();

      // Middle orange layer
      drawAsymmetricStar(r * 1.6 * s, r * 0.8 * s, 9, vInner);
      ctx.fillStyle = '#FF8C00';
      ctx.fill();

      // Inner yellow center
      drawStar(r * 0.8 * s, r * 0.4 * s, 6);
      ctx.fillStyle = '#FFD700';
      ctx.fill();

      ctx.restore();
    }

    // Draw FPV drone animation
    if (droneAnimation && droneAnimation.path.length >= 2) {
      const { path, progress, propRotation } = droneAnimation;
      const droneSize = cellSize * 0.55; // Stone size + 10%

      // Calculate current position along path
      const totalSegments = path.length - 1;
      const currentSegment = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
      const segmentProgress = (progress * totalSegments) - currentSegment;

      const from = path[currentSegment];
      const to = path[Math.min(currentSegment + 1, path.length - 1)];

      const droneX = padding + (from.x + (to.x - from.x) * segmentProgress) * cellSize;
      const droneY = padding + (from.y + (to.y - from.y) * segmentProgress) * cellSize;

      // Calculate drone rotation based on movement direction
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const droneAngle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(droneX, droneY);
      ctx.rotate(droneAngle + Math.PI / 2); // Point drone in direction of travel

      // Draw FPV drone body (black)
      ctx.fillStyle = '#000000';

      // Main body (rounded rectangle)
      const bodyW = droneSize * 0.4;
      const bodyH = droneSize * 0.5;
      ctx.beginPath();
      ctx.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, droneSize * 0.08);
      ctx.fill();

      // Draw 4 arms
      const armLength = droneSize * 0.4;
      const armWidth = droneSize * 0.08;
      const armAngles = [-Math.PI / 4, Math.PI / 4, Math.PI * 3 / 4, -Math.PI * 3 / 4];

      for (const angle of armAngles) {
        ctx.save();
        ctx.rotate(angle);
        ctx.fillRect(-armWidth / 2, 0, armWidth, armLength);
        ctx.restore();
      }

      // Draw 4 propellers (spinning)
      const propRadius = droneSize * 0.2;
      const motorRadius = droneSize * 0.06;

      for (let i = 0; i < 4; i++) {
        const angle = armAngles[i];
        const motorX = Math.sin(angle) * armLength;
        const motorY = Math.cos(angle) * armLength;

        ctx.save();
        ctx.translate(motorX, motorY);

        // Motor hub
        ctx.beginPath();
        ctx.arc(0, 0, motorRadius, 0, Math.PI * 2);
        ctx.fill();

        // Spinning propeller blades
        ctx.rotate(propRotation + i * Math.PI / 2); // Offset each prop
        ctx.fillStyle = '#333333';
        for (let b = 0; b < 2; b++) {
          ctx.save();
          ctx.rotate(b * Math.PI);
          ctx.beginPath();
          ctx.ellipse(propRadius * 0.5, 0, propRadius * 0.6, propRadius * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      }

      ctx.restore();
    }

    // When holding a stone, show snapped ghost stone at target position
    if (heldStone && hoverPos && board[hoverPos.y][hoverPos.x] === null) {
      const cx = padding + hoverPos.x * cellSize;
      const cy = padding + hoverPos.y * cellSize;
      drawStone(ctx, cx, cy, heldStone.color, cellSize * 0.45, true);
    }

    // Highlight stone under cursor when not holding anything (for pickup)
    if (!hideHoverRing && !heldStone && hoverPos && board[hoverPos.y][hoverPos.x] !== null) {
      const cx = padding + hoverPos.x * cellSize;
      const cy = padding + hoverPos.y * cellSize;
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [board, size, canvasSize, heldStone, lastMove, hoverPos, cellSize, padding, drawStone, getStarPoints, boardColor, starPointColor, whiteStoneMarker, hideHoverRing, explosionPositions, droneAnimation]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const maxSize = getMaxBoardSize();
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const newSize = Math.min(containerWidth, maxSize);
        setCanvasSize(newSize);
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

  // Redraw when state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = canvasToBoard(e.clientX, e.clientY);
      setHoverPos(pos);
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

  // Handle touch start for mobile - show hover effect
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = canvasToBoard(touch.clientX, touch.clientY);
      setHoverPos(pos);
    },
    [canvasToBoard]
  );

  // Handle touch move for dragging - snap to nearest intersection
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = canvasToBoard(touch.clientX, touch.clientY);
      setHoverPos(pos);
    },
    [canvasToBoard]
  );

  // Handle touch end - execute click at last touch position
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const pos = canvasToBoard(touch.clientX, touch.clientY);
      if (pos) {
        onBoardClick(pos);
      }
      setHoverPos(null);
    },
    [canvasToBoard, onBoardClick]
  );

  return (
    <div ref={containerRef} className="w-full mx-auto" style={{ maxWidth: canvasSize }}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPos(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => setHoverPos(null)}
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
        {/* Buttons in bottom perimeter area */}
        {bottomButtons && (
          <div
            className="absolute flex items-center justify-between"
            style={{ bottom: '1%', left: '10%', right: '10%' }}
          >
            {bottomButtons}
          </div>
        )}
      </div>
    </div>
  );
}
