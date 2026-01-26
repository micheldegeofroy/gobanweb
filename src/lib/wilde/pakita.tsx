'use client';

export type Direction = 'right' | 'left' | 'up' | 'down';

interface PakitaProps {
  x: number; // Pixel position X (center)
  y: number; // Pixel position Y (center)
  direction: Direction;
  size: number; // Size in pixels
  stonesEaten?: number; // Grows as she eats more stones
}

// Pakita - uses the pakita.png image
export function Pakita({ x, y, direction, size, stonesEaten = 0 }: PakitaProps) {
  // Pakita is 50% bigger than stones (size passed is actual stone diameter on screen)
  const growthFactor = 1 + Math.min(stonesEaten * 0.05, 0.5);
  const actualSize = size * 1.5 * growthFactor;
  const pixelX = x - actualSize / 2;
  const pixelY = y - actualSize / 2;

  // Rotation based on direction (image mouth opens to the right)
  const rotation = {
    right: 0,
    down: 90,
    left: 180,
    up: -90,
  }[direction];

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pakita.png"
        alt="Pakita"
        width={actualSize}
        height={actualSize}
        style={{
          width: actualSize,
          height: actualSize,
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

// Position type for Pakita movement
export interface PakitaPosition {
  x: number;
  y: number;
  direction: Direction;
}

// Get next position in a direction (follows Go grid)
export function getNextPosition(pos: PakitaPosition, width: number, height: number): PakitaPosition {
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

// Sound effect when Pakita appears
export function playPakitaSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Cute playful tune
    const notes = [
      { freq: 523.25, duration: 0.1 }, // C5
      { freq: 659.25, duration: 0.1 }, // E5
      { freq: 783.99, duration: 0.1 }, // G5
      { freq: 1046.5, duration: 0.15 }, // C6
    ];

    let time = audioContext.currentTime;

    notes.forEach(note => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(note.freq, time);

      gainNode.gain.setValueAtTime(0.1, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.duration);

      oscillator.start(time);
      oscillator.stop(time + note.duration);

      time += note.duration;
    });
  } catch {
    // Audio not supported
  }
}

// Sound effect when Pakita eats a stone
export function playEatSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    // Nom nom sound
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.08);
    oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Audio not supported
  }
}
