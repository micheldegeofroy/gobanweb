# Grid-Based Character Movement Pattern

## Problem
Create a character that moves along grid lines with controlled behavior (minimum time on screen, turn limits, edge handling).

## Solution

### 1. Track movement state with refs
```typescript
const positionRef = useRef<Position | null>(null);
const stepsRef = useRef<number>(0);
const turnsRef = useRef<number>(0);
const lastDirectionRef = useRef<Direction | null>(null);
const maxTurnsRef = useRef<number>(3);
```

### 2. Direction choice with bias
```typescript
function chooseDirection(current: Direction, canContinue: boolean): Direction {
  // 70% chance to continue if possible
  if (canContinue && Math.random() < 0.7) {
    return current;
  }

  // Pick random direction (not opposite)
  const opposite = { right: 'left', left: 'right', up: 'down', down: 'up' };
  const options = ['right', 'left', 'up', 'down'].filter(d => d !== opposite[current]);
  return options[Math.floor(Math.random() * options.length)];
}
```

### 3. Track turns (direction changes)
```typescript
if (lastDirectionRef.current !== null && newDirection !== lastDirectionRef.current) {
  turnsRef.current += 1;
}
lastDirectionRef.current = newDirection;
```

### 4. Exit conditions with minimums
```typescript
const minSteps = 17;  // 5 seconds at 300ms
const minTurns = 2;

const canExit = turnsRef.current >= minTurns && stepsRef.current >= minSteps;

if (wouldExit && canExit) {
  // Allow exit
  setActive(false);
  return;
} else if (wouldExit) {
  // Force turn to stay on board
  for (const dir of directions) {
    if (isValidPosition(getNextPos(current, dir))) {
      newDirection = dir;
      turnsRef.current += 1;
      break;
    }
  }
}
```

### 5. Maximum turns to force exit
```typescript
// Set random max turns on spawn
maxTurnsRef.current = Math.floor(Math.random() * 4) + 2; // 2-5

// Force exit when max reached
if (turnsRef.current >= maxTurnsRef.current) {
  setActive(false);
  return;
}
```

### 6. Image rotation based on direction
```typescript
const rotation = {
  right: 0,    // Default facing
  down: 90,    // Clockwise
  left: 180,   // Flip
  up: -90,     // Counter-clockwise
}[direction];

// Apply via CSS transform
style={{ transform: `rotate(${rotation}deg)` }}
```

## Key Parameters
- **Move interval**: 300ms for smooth but visible movement
- **Min steps**: ~17 for 5 seconds minimum presence
- **Min turns**: 2 to ensure interesting path
- **Max turns**: 2-5 (random) to vary raid length
- **Direction bias**: 70% continue, 30% turn
