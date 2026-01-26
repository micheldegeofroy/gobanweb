# Preventing Stale Data from Polling

## Problem
When using polling to sync state with server, optimistic local updates can be overwritten by stale server data if the poll returns before the server processes the action.

## Solution: Multi-layer protection

### 1. Action cooldown timer
```typescript
const lastActionTime = useRef<number>(0);
const ACTION_COOLDOWN_MS = 5000;

// Before polling
const pollIfReady = () => {
  if (Date.now() - lastActionTime.current < ACTION_COOLDOWN_MS) return;
  fetchGame(gameId);
};

// When performing actions
lastActionTime.current = Date.now();
```

### 2. Activity flag for ongoing processes
```typescript
const pakitaActiveRef = useRef(false);

const pollIfReady = () => {
  // Skip polling during active processes
  if (pakitaActiveRef.current) return;
  if (Date.now() - lastActionTime.current < ACTION_COOLDOWN_MS) return;
  fetchGame(gameId);
};
```

### 3. Update cooldown during sub-actions
```typescript
// When Pakita eats a stone (sub-action during active process)
if (currentStone !== null) {
  // Extend the cooldown
  lastActionTime.current = Date.now();

  // Update local state
  setGame(prev => /* ... */);

  // Fire-and-forget API call
  fetch('/api/action', { /* ... */ }).catch(() => {});
}
```

## Key Patterns
- **Optimistic updates**: Update local state immediately, send API in background
- **Cooldown timer**: Block polling for N seconds after any action
- **Activity flags**: Completely disable polling during multi-step processes
- **Fire-and-forget**: Don't await API calls that don't need immediate confirmation

## When to Use
- Real-time multiplayer games
- Any UI with polling + optimistic updates
- Processes that make multiple rapid state changes
