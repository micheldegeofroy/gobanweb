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
- Character for Wilde Go (replaces Pacman)
- Pink, round, blue bow, big eyes, always open mouth
- Image: `/public/pakita.png`
- Code: `/src/lib/wilde/pakita.tsx`

## Known Issues
- **Disappearing stones**: Caused by polling fetching stale data before server processes move. Fixed with 5s cooldown after actions.
- **Error toggles**: Admin can toggle errors on/off at `/admin/errors`. When toggled off, errors should not display to users.

## Database
- Uses Neon PostgreSQL
- Schema: `/src/lib/db/schema.ts`
- Run migrations: `npm run db:push`
