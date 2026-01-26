# Claude Instructions for Goban Web

## Development Server
Always run the development server on port **30001**:
```bash
npm run dev -- -p 30001
```

Local URL: http://localhost:30001/

## Admin Panel
- URL: http://localhost:30001/admin
- Password: `goban2024`

## Resuming Sessions
To reconnect with bypass permissions and continue from previous session:
```bash
claude --dangerously-skip-permissions --continue
```

## Game Variants
- **Classic Go** (`/game`) - Traditional 2-player Go
- **Wilde Go** (`/wilde`) - Multiplayer (2-8 players), colorful, with Pakita character
- **Zen Go** (`/zen`) - 3-player, grayscale aesthetic, shared pot alternating B/W stones
- **Dom Go** (`/dom`) - Domino-style Go variant
- **Crazy Go** (`/crazy`) - Variant with special rules
- **Bang Go** (`/bang`) - Go with mines/explosions

## Key Components
- `GoBoard.tsx` - Classic Go board (canvas-based)
- `WildeGoBoard.tsx` - Wilde Go board (rainbow aesthetic, supports rectangular boards)
- `ZenGoBoard.tsx` - Zen Go board (grayscale aesthetic)
- `StonePot.tsx` - Stone pot UI component
- `TutorialBoard.tsx` - Tutorial board with animations

## Pakita Character (Wilde Go)

### Files
- **Image**: `/public/pakita.png` - Pink Pacman-like character with blue bow and big eyes
- **Component**: `/src/lib/wilde/pakita.tsx` - Renders the PNG image with rotation based on direction
- **Maria (backup)**: `/src/lib/wilde/maria.tsx` - Saved SVG design with blonde ponytail (unused)

### Activation
- Toggle via button on Wilde Go landing page (shows mini colored stones + Pakita image)
- Spawns after 10-20 moves (random threshold), resets after each appearance

### Movement Behavior
- Enters from random board edge
- Moves along grid lines (right, left, up, down)
- 70% chance to continue same direction, 30% chance to turn (not reverse)
- **Must make 2-5 turns** per eating raid (random)
- **Must stay at least 5 seconds** (17 steps at 300ms each)
- Exits when both conditions met AND reaches board edge

### Eating Stones
- Eats any stone she lands on (any player's color)
- Returns eaten stone to owner's pot
- Grows up to 50% bigger as she eats (5% per stone)
- Plays sound effects on spawn and eat

### Size Calculation
- Size = actual stone diameter on screen × 1.5
- Minimum 30px to ensure visibility
- Stone diameter = `cellSize * 0.9 * scale`

### Polling Protection
- Polling is disabled while Pakita is active
- `lastActionTime` updated when Pakita eats to prevent stale data overwrites

## Current Priorities
1. Pakita character is working well - size, movement, eating all functional
2. Zen Go implementation plan exists at `~/.claude/plans/imperative-soaring-finch.md`

## DO NOT CHANGE WITHOUT CLEAR APPROVAL
- **Pakita button** on Wilde landing page - mini stones + Pakita image design
- **Pakita size** - current 1.5× multiplier with 30px minimum works well

## Known Issues & Solutions
- **Disappearing stones**: Fixed by disabling polling while Pakita active + 5s cooldown after actions
- **Pakita too small**: Fixed by calculating actual stone diameter on screen with minimum 30px
- **Pakita exiting too fast**: Fixed with minimum 2 turns and 5 seconds requirement

## Database
- Uses Neon PostgreSQL
- Schema: `/src/lib/db/schema.ts`
- Run migrations: `npm run db:push`
- Key field: `pakita_mode` (boolean) on `wilde_games` table
