'use client';

export type Direction = 'right' | 'left' | 'up' | 'down';

interface MariaProps {
  x: number; // Pixel position X (center)
  y: number; // Pixel position Y (center)
  direction: Direction;
  size: number; // Size in pixels
  stonesEaten?: number; // Grows as she eats more stones
}

// Maria - round pink creature with blonde ponytail, big open mouth, pink lipstick
export function Maria({ x, y, direction, size, stonesEaten = 0 }: MariaProps) {
  // Maria grows as she eats stones (up to 50% bigger)
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
