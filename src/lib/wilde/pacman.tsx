'use client';

import { useEffect, useState } from 'react';

export type PacmanType = 'pacman' | 'msPacman' | 'babyPacman';
export type Direction = 'right' | 'left' | 'up' | 'down';

interface PacmanProps {
  type: PacmanType;
  x: number; // Pixel position X (center)
  y: number; // Pixel position Y (center)
  direction: Direction;
  size: number; // Size in pixels
}

// Pacman component with animated mouth
export function Pacman({ type, x, y, direction, size }: PacmanProps) {
  const [mouthOpen, setMouthOpen] = useState(true);

  // Animate mouth
  useEffect(() => {
    const interval = setInterval(() => {
      setMouthOpen(prev => !prev);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Baby Pacman is smaller
  const actualSize = type === 'babyPacman' ? size * 0.65 : size;
  const pixelX = x - actualSize / 2;
  const pixelY = y - actualSize / 2;

  // Rotation based on direction
  const rotation = {
    right: 0,
    down: 90,
    left: 180,
    up: 270,
  }[direction];

  const mouthAngle = mouthOpen ? 45 : 5;

  // Colors - Baby Pacman is slightly more orange/peachy
  const bodyColor = type === 'babyPacman' ? '#FFEB3B' : '#FFFF00';
  const bowColor = '#FF69B4'; // Pink bow for Ms. Pacman
  const eyeColor = '#000000';

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-150"
      style={{
        left: pixelX,
        top: pixelY,
        width: actualSize,
        height: actualSize,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <svg viewBox="0 0 100 100" width={actualSize} height={actualSize}>
        {/* Pacman body with mouth */}
        <path
          d={`
            M 50 50
            L ${50 + 45 * Math.cos((mouthAngle * Math.PI) / 180)} ${50 - 45 * Math.sin((mouthAngle * Math.PI) / 180)}
            A 45 45 0 1 0 ${50 + 45 * Math.cos((mouthAngle * Math.PI) / 180)} ${50 + 45 * Math.sin((mouthAngle * Math.PI) / 180)}
            Z
          `}
          fill={bodyColor}
          stroke="#FFD700"
          strokeWidth="2"
        />

        {/* Eye - bigger for baby */}
        <circle
          cx="60"
          cy="25"
          r={type === 'babyPacman' ? 8 : 6}
          fill={eyeColor}
        />

        {/* Ms. Pacman accessories */}
        {type === 'msPacman' && (
          <>
            {/* Big pink bow on top */}
            <ellipse cx="38" cy="8" rx="14" ry="10" fill={bowColor} stroke="#FF1493" strokeWidth="2" />
            <ellipse cx="62" cy="8" rx="14" ry="10" fill={bowColor} stroke="#FF1493" strokeWidth="2" />
            <circle cx="50" cy="10" r="6" fill="#FF1493" />
            <circle cx="50" cy="10" r="3" fill={bowColor} />

            {/* Beauty mark */}
            <circle cx="75" cy="40" r="3" fill="#000" />

            {/* Lipstick (on mouth edge) */}
            <path
              d={`M 95 ${50 - 8} Q 98 50 95 ${50 + 8}`}
              fill="none"
              stroke="#FF0000"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Baby Pacman accessories */}
        {type === 'babyPacman' && (
          <>
            {/* Pacifier/binky */}
            <circle cx="85" cy="55" r="8" fill="#87CEEB" stroke="#5F9EA0" strokeWidth="2" />
            <circle cx="85" cy="55" r="4" fill="#FFB6C1" />
            {/* Rosy cheeks */}
            <circle cx="70" cy="60" r="6" fill="#FFB6C1" opacity="0.6" />
          </>
        )}
      </svg>
    </div>
  );
}

// Ghost component (optional, for extra fun)
export function Ghost({ x, y, cellSize, boardOffsetX, boardOffsetY, color = '#FF0000' }: {
  x: number;
  y: number;
  cellSize: number;
  boardOffsetX: number;
  boardOffsetY: number;
  color?: string;
}) {
  const size = cellSize * 0.85;
  const pixelX = boardOffsetX + x * cellSize - size / 2;
  const pixelY = boardOffsetY + y * cellSize - size / 2;

  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{
        left: pixelX,
        top: pixelY,
        width: size,
        height: size,
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* Ghost body */}
        <path
          d={`
            M 10 100
            L 10 50
            A 40 40 0 0 1 90 50
            L 90 100
            L 75 85
            L 60 100
            L 50 85
            L 40 100
            L 25 85
            L 10 100
            Z
          `}
          fill={color}
          stroke={color}
          strokeWidth="2"
        />

        {/* Eyes */}
        <ellipse cx="35" cy="45" rx="12" ry="15" fill="white" />
        <ellipse cx="65" cy="45" rx="12" ry="15" fill="white" />
        <circle cx="38" cy="48" r="6" fill="#0000FF" />
        <circle cx="68" cy="48" r="6" fill="#0000FF" />
      </svg>
    </div>
  );
}

// Position type for Pacman movement
export interface PacmanPosition {
  x: number;
  y: number;
  direction: Direction;
}

// Get next position in a direction
export function getNextPosition(pos: PacmanPosition, width: number, height: number): PacmanPosition {
  let { x, y, direction } = pos;

  switch (direction) {
    case 'right':
      x = (x + 1) % width;
      break;
    case 'left':
      x = (x - 1 + width) % width;
      break;
    case 'down':
      y = (y + 1) % height;
      break;
    case 'up':
      y = (y - 1 + height) % height;
      break;
  }

  return { x, y, direction };
}

// Choose a random direction, biased toward continuing or turning
export function chooseDirection(current: Direction, canContinue: boolean): Direction {
  const directions: Direction[] = ['right', 'left', 'up', 'down'];

  // 70% chance to continue if possible
  if (canContinue && Math.random() < 0.7) {
    return current;
  }

  // Otherwise pick a random direction (not opposite)
  const opposite: Record<Direction, Direction> = {
    right: 'left',
    left: 'right',
    up: 'down',
    down: 'up',
  };

  const options = directions.filter(d => d !== opposite[current]);
  return options[Math.floor(Math.random() * options.length)];
}

// Sound effects URLs (using Web Audio API for classic sounds)
export function playWakaSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(349, audioContext.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch {
    // Audio not supported
  }
}

export function playPacmanMusic() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Classic Pacman beginning tune notes
    const notes = [
      { freq: 493.88, duration: 0.1 }, // B4
      { freq: 987.77, duration: 0.1 }, // B5
      { freq: 739.99, duration: 0.1 }, // F#5
      { freq: 622.25, duration: 0.1 }, // D#5
      { freq: 987.77, duration: 0.05 }, // B5
      { freq: 739.99, duration: 0.15 }, // F#5
      { freq: 622.25, duration: 0.2 }, // D#5

      { freq: 523.25, duration: 0.1 }, // C5
      { freq: 1046.5, duration: 0.1 }, // C6
      { freq: 783.99, duration: 0.1 }, // G5
      { freq: 659.25, duration: 0.1 }, // E5
      { freq: 1046.5, duration: 0.05 }, // C6
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 659.25, duration: 0.2 }, // E5
    ];

    let time = audioContext.currentTime;

    notes.forEach(note => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(note.freq, time);

      gainNode.gain.setValueAtTime(0.08, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.duration);

      oscillator.start(time);
      oscillator.stop(time + note.duration);

      time += note.duration;
    });
  } catch {
    // Audio not supported
  }
}

export function playEatSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';
    // Chomping sound - frequency sweep
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 0.05);
    oscillator.frequency.linearRampToValueAtTime(200, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Audio not supported
  }
}
