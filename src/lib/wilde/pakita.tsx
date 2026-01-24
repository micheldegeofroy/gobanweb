'use client';

export type Direction = 'right' | 'left' | 'up' | 'down';

interface PakitaProps {
  x: number; // Pixel position X (center)
  y: number; // Pixel position Y (center)
  direction: Direction;
  size: number; // Size in pixels
  stonesEaten?: number; // Grows as she eats more stones
}

// Pakita - round pink creature with blonde ponytail, big open mouth, pink lipstick
export function Pakita({ x, y, direction, size, stonesEaten = 0 }: PakitaProps) {
  // Pakita grows as she eats stones (up to 50% bigger)
  const growthFactor = 1 + Math.min(stonesEaten * 0.05, 0.5);
  const actualSize = size * growthFactor;
  const pixelX = x - actualSize / 2;
  const pixelY = y - actualSize / 2;

  // Rotation based on direction
  const rotation = {
    right: 0,
    down: 90,
    left: 180,
    up: 270,
  }[direction];

  // Big open mouth angle
  const mouthAngle = 50;

  // Colors
  const bodyColor = '#FF69B4'; // Hot pink body
  const darkPink = '#FF1493'; // Deep pink outline
  const blondeColor = '#FFD700'; // Golden blonde
  const lightBlonde = '#FFF8DC'; // Light blonde highlights
  const lipstickColor = '#FF1493'; // Pink lipstick

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
        {/* Blonde ponytail - behind the body */}
        <ellipse cx="8" cy="30" rx="15" ry="35" fill={blondeColor} stroke={lightBlonde} strokeWidth="1" />
        <ellipse cx="5" cy="50" rx="10" ry="20" fill={blondeColor} />
        <ellipse cx="12" cy="25" rx="8" ry="12" fill={lightBlonde} opacity="0.6" />

        {/* Hair tie - pink scrunchie */}
        <ellipse cx="20" cy="18" rx="8" ry="5" fill={darkPink} stroke="#C71585" strokeWidth="1" />

        {/* Round pink body with big open mouth */}
        <path
          d={`
            M 50 50
            L ${50 + 45 * Math.cos((mouthAngle * Math.PI) / 180)} ${50 - 45 * Math.sin((mouthAngle * Math.PI) / 180)}
            A 45 45 0 1 0 ${50 + 45 * Math.cos((mouthAngle * Math.PI) / 180)} ${50 + 45 * Math.sin((mouthAngle * Math.PI) / 180)}
            Z
          `}
          fill={bodyColor}
          stroke={darkPink}
          strokeWidth="3"
        />

        {/* Pink lipstick on mouth edges */}
        <path
          d={`M ${50 + 42 * Math.cos((mouthAngle * Math.PI) / 180)} ${50 - 42 * Math.sin((mouthAngle * Math.PI) / 180)}
              L ${50 + 48 * Math.cos((mouthAngle * Math.PI) / 180)} ${50 - 48 * Math.sin((mouthAngle * Math.PI) / 180)}`}
          stroke={lipstickColor}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d={`M ${50 + 42 * Math.cos((mouthAngle * Math.PI) / 180)} ${50 + 42 * Math.sin((mouthAngle * Math.PI) / 180)}
              L ${50 + 48 * Math.cos((mouthAngle * Math.PI) / 180)} ${50 + 48 * Math.sin((mouthAngle * Math.PI) / 180)}`}
          stroke={lipstickColor}
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Eye */}
        <circle cx="55" cy="25" r="8" fill="#FFFFFF" stroke="#000" strokeWidth="1" />
        <circle cx="57" cy="25" r="5" fill="#000000" />
        <circle cx="59" cy="23" r="2" fill="#FFFFFF" />

        {/* Eyelashes */}
        <path d="M 48 18 L 45 12" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        <path d="M 53 15 L 52 8" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        <path d="M 58 14 L 60 7" stroke="#000" strokeWidth="2" strokeLinecap="round" />

        {/* Cute blush */}
        <ellipse cx="70" cy="40" rx="8" ry="5" fill="#FFB6C1" opacity="0.7" />
      </svg>
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
