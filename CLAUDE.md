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
- **Wilde Go** (`/wilde`) - Multiplayer (2-8 players), colorful, with Pakita-Mendez character
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

## Pakita-Mendez
- Character for Wilde Go
- Pink, round, big eyes, always open mouth, blonde ponytail
- Image: `/public/pakita.png`
- Code: `/src/lib/wilde/pakita.tsx`

### Activation
- Toggle on/off via the yellow "Pakita-Mendez" button when creating a Wilde Go game
- When enabled, Pakita appears after 10-20 moves (random), resets after each appearance

### Behavior
- Appears on game edge randomly on the board during the game
- Moves along grid lines - can go right, left, up, down
- 70% chance to continue in same direction
- Wraps around board edges (goes from one side to the other)

### Eating Stones
- Eats any stone she lands on (any player's color)
- Returns stone to owner's pot - the eaten stone goes back to that player's bowl
- No turn restrictions - eating happens independently of whose turn it is
- Grows bigger as she eats more stones (up to 50% larger)

## DO NOT CHANGE WITHOUT CLEAR APPROVAL
- **Pakita-Mendez button** on Wilde landing page (`/src/app/wilde/page.tsx`) - the yellow toggle button with Pakita image

## Known Issues
- **Disappearing stones**: Caused by polling fetching stale data before server processes move. Fixed with 5s cooldown after actions.
- **Error toggles**: Admin can toggle errors on/off at `/admin/errors`. When toggled off, errors should not display to users.

## Database
- Uses Neon PostgreSQL
- Schema: `/src/lib/db/schema.ts`
- Run migrations: `npm run db:push`
