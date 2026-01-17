'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CrazyGoBoard, { CrazyHeldStone } from '@/components/CrazyGoBoard';
import CrazyStonePot from '@/components/CrazyStonePot';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

type CrazyStone = 0 | 1 | 2 | 3 | null;
type CrazyBoard = CrazyStone[][];
type Position = { x: number; y: number };

interface CrazyGameData {
  id: string;
  boardSize: number;
  boardState: CrazyBoard;
  blackPotCount: number;
  whitePotCount: number;
  brownPotCount: number;
  greyPotCount: number;
  blackCaptured: number;
  whiteCaptured: number;
  brownCaptured: number;
  greyCaptured: number;
  lastMoveX: number | null;
  lastMoveY: number | null;
  koPointX: number | null;
  koPointY: number | null;
  currentTurn: number;
  moveNumber: number;
  connectedUsers: number;
  publicKey: string;
  updatedAt: string;
}

interface ReplayAction {
  actionType: string;
  stoneColor: number | null;
  fromX: number | null;
  fromY: number | null;
  toX: number | null;
  toY: number | null;
  moveNumber: number;
}

// Client-side capture detection for 4-player Go
function detectAndRemoveCaptures(board: CrazyBoard, placedX: number, placedY: number, placedColor: CrazyStone): {
  newBoard: CrazyBoard;
  blackCaptured: number;
  whiteCaptured: number;
  brownCaptured: number;
  greyCaptured: number;
} {
  const size = board.length;
  const newBoard = board.map(row => [...row]) as CrazyBoard;
  let blackCaptured = 0;
  let whiteCaptured = 0;
  let brownCaptured = 0;
  let greyCaptured = 0;

  const getAdjacent = (pos: Position): Position[] => {
    const adj: Position[] = [];
    if (pos.x > 0) adj.push({ x: pos.x - 1, y: pos.y });
    if (pos.x < size - 1) adj.push({ x: pos.x + 1, y: pos.y });
    if (pos.y > 0) adj.push({ x: pos.x, y: pos.y - 1 });
    if (pos.y < size - 1) adj.push({ x: pos.x, y: pos.y + 1 });
    return adj;
  };

  const getGroup = (start: Position): Position[] => {
    const c = newBoard[start.y][start.x];
    if (c === null) return [];
    const group: Position[] = [];
    const visited = new Set<string>();
    const queue: Position[] = [start];
    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = `${pos.x},${pos.y}`;
      if (visited.has(key)) continue;
      if (newBoard[pos.y][pos.x] !== c) continue;
      visited.add(key);
      group.push(pos);
      for (const adj of getAdjacent(pos)) {
        if (!visited.has(`${adj.x},${adj.y}`)) queue.push(adj);
      }
    }
    return group;
  };

  const countLiberties = (group: Position[]): number => {
    const liberties = new Set<string>();
    for (const pos of group) {
      for (const adj of getAdjacent(pos)) {
        if (newBoard[adj.y][adj.x] === null) liberties.add(`${adj.x},${adj.y}`);
      }
    }
    return liberties.size;
  };

  // Check adjacent opponent groups first (captures happen before self-capture check)
  for (const adj of getAdjacent({ x: placedX, y: placedY })) {
    const adjColor = newBoard[adj.y][adj.x];
    if (adjColor !== null && adjColor !== placedColor) {
      const group = getGroup(adj);
      if (countLiberties(group) === 0) {
        for (const pos of group) {
          const capturedColor = newBoard[pos.y][pos.x];
          if (capturedColor === 0) blackCaptured++;
          else if (capturedColor === 1) whiteCaptured++;
          else if (capturedColor === 2) brownCaptured++;
          else if (capturedColor === 3) greyCaptured++;
          newBoard[pos.y][pos.x] = null;
        }
      }
    }
  }

  return { newBoard, blackCaptured, whiteCaptured, brownCaptured, greyCaptured };
}

// 4-player suicide check
function wouldBeSuicide(board: CrazyBoard, x: number, y: number, color: CrazyStone): boolean {
  if (color === null) return false;
  const size = board.length;
  const testBoard = board.map(row => [...row]) as CrazyBoard;
  testBoard[y][x] = color;

  const getAdjacent = (pos: Position): Position[] => {
    const adj: Position[] = [];
    if (pos.x > 0) adj.push({ x: pos.x - 1, y: pos.y });
    if (pos.x < size - 1) adj.push({ x: pos.x + 1, y: pos.y });
    if (pos.y > 0) adj.push({ x: pos.x, y: pos.y - 1 });
    if (pos.y < size - 1) adj.push({ x: pos.x, y: pos.y + 1 });
    return adj;
  };

  const getGroup = (start: Position): Position[] => {
    const c = testBoard[start.y][start.x];
    if (c === null) return [];
    const group: Position[] = [];
    const visited = new Set<string>();
    const queue: Position[] = [start];
    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = `${pos.x},${pos.y}`;
      if (visited.has(key)) continue;
      if (testBoard[pos.y][pos.x] !== c) continue;
      visited.add(key);
      group.push(pos);
      for (const adj of getAdjacent(pos)) {
        if (!visited.has(`${adj.x},${adj.y}`)) queue.push(adj);
      }
    }
    return group;
  };

  const countLiberties = (group: Position[]): number => {
    const liberties = new Set<string>();
    for (const pos of group) {
      for (const adj of getAdjacent(pos)) {
        if (testBoard[adj.y][adj.x] === null) liberties.add(`${adj.x},${adj.y}`);
      }
    }
    return liberties.size;
  };

  // Check if captures any opponent
  for (const adj of getAdjacent({ x, y })) {
    const adjColor = testBoard[adj.y][adj.x];
    if (adjColor !== null && adjColor !== color) {
      const group = getGroup(adj);
      if (countLiberties(group) === 0) return false;
    }
  }

  const placedGroup = getGroup({ x, y });
  return countLiberties(placedGroup) === 0;
}

export default function CrazyGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceType = useDeviceType();
  const haptic = useHapticFeedback();
  const isDesktop = deviceType === 'desktop';
  const isMobile = deviceType === 'mobile';

  const [gameId, setGameId] = useState<string | null>(null);
  const [urlKey, setUrlKey] = useState<string | null>(null);
  const [hasCheckedUrl, setHasCheckedUrl] = useState(false);

  useEffect(() => {
    params.then(p => {
      setGameId(p.gameId);
      setUrlKey(searchParams.get('key'));
      setHasCheckedUrl(true);
    });
  }, [params, searchParams]);

  const [game, setGame] = useState<CrazyGameData | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [heldStone, setHeldStone] = useState<CrazyHeldStone | null>(null);
  const hasInitialized = useRef(false);

  // Replay state
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayActions, setReplayActions] = useState<ReplayAction[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayBoard, setReplayBoard] = useState<CrazyBoard | null>(null);
  const [replayBoardSize, setReplayBoardSize] = useState(19);
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTime = useRef<number>(0); // Track when last action was performed

  const fetchGame = useCallback(async (gId: string) => {
    try {
      const res = await fetch(`/api/crazy/${gId}`);
      if (!res.ok) {
        if (res.status === 404) setError('Game not found');
        else throw new Error('Failed to fetch game');
        return null;
      }
      const data = await res.json();
      setGame(data);
      return data;
    } catch (err) {
      console.error('Error fetching game:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!gameId || !hasCheckedUrl || hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeGame = async (key: string) => {
      localStorage.setItem(`crazy_${gameId}_privateKey`, key);
      setPrivateKey(key);
      await fetchGame(gameId);
      setShowKeyModal(false);
      setIsLoading(false);
    };

    if (urlKey) {
      initializeGame(urlKey);
    } else {
      const storedKey = localStorage.getItem(`crazy_${gameId}_privateKey`);
      if (storedKey) {
        initializeGame(storedKey);
      } else {
        setShowKeyModal(true);
        setIsLoading(false);
      }
    }
  }, [gameId, hasCheckedUrl, urlKey, fetchGame]);

  // Poll for updates (slower when tab is hidden, skip after recent actions)
  useEffect(() => {
    if (!game || !privateKey || !gameId) return;

    let interval: NodeJS.Timeout;
    const ACTIVE_POLL_MS = 2000;   // 2s when tab is visible
    const HIDDEN_POLL_MS = 10000;  // 10s when tab is hidden
    const ACTION_COOLDOWN_MS = 1500; // Skip polling for 1.5s after action

    const pollIfReady = () => {
      // Skip polling if we recently performed an action (server response is authoritative)
      if (Date.now() - lastActionTime.current < ACTION_COOLDOWN_MS) return;
      fetchGame(gameId);
    };

    const startPolling = (ms: number) => {
      clearInterval(interval);
      interval = setInterval(pollIfReady, ms);
    };

    const handleVisibility = () => {
      startPolling(document.hidden ? HIDDEN_POLL_MS : ACTIVE_POLL_MS);
    };

    startPolling(document.hidden ? HIDDEN_POLL_MS : ACTIVE_POLL_MS);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [game, privateKey, gameId, fetchGame]);

  const performAction = async (
    actionType: 'place' | 'remove' | 'move',
    options: {
      stoneColor?: 0 | 1 | 2 | 3;
      fromX?: number;
      fromY?: number;
      toX?: number;
      toY?: number;
    }
  ) => {
    if (!privateKey || !game) return;

    // Mark action time to prevent polling from overwriting with stale data
    lastActionTime.current = Date.now();

    try {
      const res = await fetch(`/api/crazy/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey, actionType, ...options }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Action failed');
        setTimeout(() => setError(null), 3000);
        return false;
      }

      // Don't update state from server response - optimistic update already has correct data
      // This prevents flicker from double state update. Next poll will sync if needed.
      return true;
    } catch (err) {
      console.error('Error performing action:', err);
      setError('Action failed');
      setTimeout(() => setError(null), 3000);
      return false;
    }
  };

  const handlePotClick = (color: 0 | 1 | 2 | 3) => {
    if (heldStone) {
      if (heldStone.color === color) {
        if (heldStone.fromBoard) {
          performAction('remove', {
            fromX: heldStone.fromBoard.x,
            fromY: heldStone.fromBoard.y,
          });
        }
        setHeldStone(null);
        haptic.stonePlaced();
      }
    } else {
      // Japanese scoring: only potCount matters for picking up (captured are just points)
      const potCounts = {
        0: game?.blackPotCount ?? 0,
        1: game?.whitePotCount ?? 0,
        2: game?.brownPotCount ?? 0,
        3: game?.greyPotCount ?? 0,
      };
      if (potCounts[color] > 0) {
        setHeldStone({ color });
        haptic.stonePickedUp();
      }
    }
  };

  const handleBoardClick = (pos: Position) => {
    if (!game) return;
    const stoneAtPos = game.boardState[pos.y][pos.x];

    if (heldStone) {
      if (stoneAtPos === null) {
        if (heldStone.fromBoard) {
          // Moving a stone on the board
          const testBoard = game.boardState.map(row => [...row]) as CrazyBoard;
          testBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          if (wouldBeSuicide(testBoard, pos.x, pos.y, heldStone.color)) {
            haptic.invalidMove();
            return;
          }
          if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) {
            haptic.invalidMove();
            return;
          }

          // Block polling immediately to prevent stale data overwriting optimistic update
          lastActionTime.current = Date.now();

          // Optimistic update for move
          const newBoard = game.boardState.map(row => [...row]) as CrazyBoard;
          newBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          newBoard[pos.y][pos.x] = heldStone.color;

          // Detect captures after move
          const { newBoard: boardAfterCaptures, blackCaptured, whiteCaptured, brownCaptured, greyCaptured } =
            detectAndRemoveCaptures(newBoard, pos.x, pos.y, heldStone.color);

          // Haptic feedback
          const totalCaptured = blackCaptured + whiteCaptured + brownCaptured + greyCaptured;
          if (totalCaptured > 0) {
            haptic.capture();
          } else {
            haptic.stonePlaced();
          }

          // Japanese scoring: capturing player (the one who moved) gets credit
          setGame(prev => prev ? {
            ...prev,
            boardState: boardAfterCaptures,
            lastMoveX: pos.x,
            lastMoveY: pos.y,
            blackCaptured: prev.blackCaptured + (heldStone.color === 0 ? totalCaptured : 0),
            whiteCaptured: prev.whiteCaptured + (heldStone.color === 1 ? totalCaptured : 0),
            brownCaptured: prev.brownCaptured + (heldStone.color === 2 ? totalCaptured : 0),
            greyCaptured: prev.greyCaptured + (heldStone.color === 3 ? totalCaptured : 0),
          } : null);
          setHeldStone(null);

          // Send to server in background
          performAction('move', {
            fromX: heldStone.fromBoard.x,
            fromY: heldStone.fromBoard.y,
            toX: pos.x,
            toY: pos.y,
          });
        } else {
          // Placing a stone from pot
          if (wouldBeSuicide(game.boardState, pos.x, pos.y, heldStone.color)) {
            haptic.invalidMove();
            return;
          }
          if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) {
            haptic.invalidMove();
            return;
          }

          // Block polling immediately to prevent stale data overwriting optimistic update
          lastActionTime.current = Date.now();

          // Optimistic update - place stone and detect captures
          const newBoard = game.boardState.map(row => [...row]) as CrazyBoard;
          newBoard[pos.y][pos.x] = heldStone.color;

          const { newBoard: boardAfterCaptures, blackCaptured, whiteCaptured, brownCaptured, greyCaptured } =
            detectAndRemoveCaptures(newBoard, pos.x, pos.y, heldStone.color);

          // Determine which pot to decrement
          const newPotCount = {
            blackPotCount: game.blackPotCount - (heldStone.color === 0 ? 1 : 0),
            whitePotCount: game.whitePotCount - (heldStone.color === 1 ? 1 : 0),
            brownPotCount: game.brownPotCount - (heldStone.color === 2 ? 1 : 0),
            greyPotCount: game.greyPotCount - (heldStone.color === 3 ? 1 : 0),
          };

          // Haptic feedback
          const totalCaptured = blackCaptured + whiteCaptured + brownCaptured + greyCaptured;
          if (totalCaptured > 0) {
            haptic.capture();
          } else {
            haptic.stonePlaced();
          }

          // Japanese scoring: capturing player (the one placing) gets credit
          setGame(prev => prev ? {
            ...prev,
            boardState: boardAfterCaptures,
            lastMoveX: pos.x,
            lastMoveY: pos.y,
            ...newPotCount,
            blackCaptured: prev.blackCaptured + (heldStone.color === 0 ? totalCaptured : 0),
            whiteCaptured: prev.whiteCaptured + (heldStone.color === 1 ? totalCaptured : 0),
            brownCaptured: prev.brownCaptured + (heldStone.color === 2 ? totalCaptured : 0),
            greyCaptured: prev.greyCaptured + (heldStone.color === 3 ? totalCaptured : 0),
            currentTurn: (prev.currentTurn + 1) % 4, // Advance turn
          } : null);
          setHeldStone(null);

          // Send to server in background
          performAction('place', {
            stoneColor: heldStone.color,
            toX: pos.x,
            toY: pos.y,
          });
        }
      }
    } else {
      if (stoneAtPos !== null) {
        setHeldStone({ color: stoneAtPos, fromBoard: pos });
        haptic.stonePickedUp();
      }
    }
  };

  const handleShare = async () => {
    if (!privateKey || !gameId) return;
    const shareUrl = `${window.location.origin}/crazy/${gameId}?key=${encodeURIComponent(privateKey)}`;

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for iOS and older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Final fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error('Failed to copy');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleKeySubmit = async () => {
    if (!keyInput.trim() || !gameId) return;
    let key = keyInput.trim();
    try {
      if (key.includes('://') || key.includes('key=')) {
        const url = new URL(key.includes('://') ? key : `https://dummy.com?${key}`);
        const urlKey = url.searchParams.get('key');
        if (urlKey) key = urlKey;
      }
    } catch {}
    localStorage.setItem(`crazy_${gameId}_privateKey`, key);
    setPrivateKey(key);
    await fetchGame(gameId);
    setShowKeyModal(false);
  };

  // Replay functions
  const createEmptyBoard = (size: number): CrazyBoard => {
    return Array(size).fill(null).map(() => Array(size).fill(null));
  };

  const applyActionToBoard = (board: CrazyBoard, action: ReplayAction): CrazyBoard => {
    const newBoard = board.map(row => [...row]) as CrazyBoard;

    if (action.actionType === 'place' && action.toX !== null && action.toY !== null) {
      newBoard[action.toY][action.toX] = action.stoneColor as CrazyStone;
      // Simple capture detection for replay
      const size = board.length;
      const getAdjacent = (x: number, y: number): Position[] => {
        const adj: Position[] = [];
        if (x > 0) adj.push({ x: x - 1, y });
        if (x < size - 1) adj.push({ x: x + 1, y });
        if (y > 0) adj.push({ x, y: y - 1 });
        if (y < size - 1) adj.push({ x, y: y + 1 });
        return adj;
      };
      const getGroup = (start: Position, b: CrazyBoard): Position[] => {
        const c = b[start.y][start.x];
        if (c === null) return [];
        const group: Position[] = [];
        const visited = new Set<string>();
        const queue: Position[] = [start];
        while (queue.length > 0) {
          const pos = queue.shift()!;
          const key = `${pos.x},${pos.y}`;
          if (visited.has(key)) continue;
          if (b[pos.y][pos.x] !== c) continue;
          visited.add(key);
          group.push(pos);
          for (const a of getAdjacent(pos.x, pos.y)) {
            if (!visited.has(`${a.x},${a.y}`)) queue.push(a);
          }
        }
        return group;
      };
      const countLiberties = (group: Position[], b: CrazyBoard): number => {
        const liberties = new Set<string>();
        for (const pos of group) {
          for (const a of getAdjacent(pos.x, pos.y)) {
            if (b[a.y][a.x] === null) liberties.add(`${a.x},${a.y}`);
          }
        }
        return liberties.size;
      };
      // Check for captures
      const visited = new Set<string>();
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (newBoard[y][x] === null) continue;
          const key = `${x},${y}`;
          if (visited.has(key)) continue;
          const group = getGroup({ x, y }, newBoard);
          for (const p of group) visited.add(`${p.x},${p.y}`);
          if (countLiberties(group, newBoard) === 0) {
            for (const p of group) newBoard[p.y][p.x] = null;
          }
        }
      }
    } else if (action.actionType === 'remove' && action.fromX !== null && action.fromY !== null) {
      newBoard[action.fromY][action.fromX] = null;
    } else if (action.actionType === 'move' && action.fromX !== null && action.fromY !== null && action.toX !== null && action.toY !== null) {
      const stone = newBoard[action.fromY][action.fromX];
      newBoard[action.fromY][action.fromX] = null;
      newBoard[action.toY][action.toX] = stone;
    }

    return newBoard;
  };

  const startReplay = async () => {
    if (!gameId) return;
    try {
      const res = await fetch(`/api/crazy/${gameId}/replay`);
      if (!res.ok) {
        setError('No moves to replay');
        setTimeout(() => setError(null), 3000);
        return;
      }
      const data = await res.json();
      if (data.actions.length === 0) {
        setError('No moves to replay');
        setTimeout(() => setError(null), 3000);
        return;
      }
      setReplayActions(data.actions);
      setReplayBoardSize(data.boardSize);
      setReplayBoard(createEmptyBoard(data.boardSize));
      setReplayIndex(0);
      setIsReplayMode(true);
      setIsPlaying(true); // Auto-start playback
    } catch (err) {
      console.error('Error starting replay:', err);
      setError('Failed to load replay');
      setTimeout(() => setError(null), 3000);
    }
  };

  const exitReplay = () => {
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setIsReplayMode(false);
    setIsPlaying(false);
    setReplayActions([]);
    setReplayIndex(0);
    setReplayBoard(null);
  };

  const stepForward = useCallback(() => {
    if (replayIndex < replayActions.length && replayBoard) {
      const newBoard = applyActionToBoard(replayBoard, replayActions[replayIndex]);
      setReplayBoard(newBoard);
      setReplayIndex(prev => prev + 1);
    }
  }, [replayIndex, replayActions, replayBoard]);

  const stepBackward = () => {
    if (replayIndex > 0) {
      // Rebuild board from start to index - 1
      let board = createEmptyBoard(replayBoardSize);
      for (let i = 0; i < replayIndex - 1; i++) {
        board = applyActionToBoard(board, replayActions[i]);
      }
      setReplayBoard(board);
      setReplayIndex(prev => prev - 1);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  // Auto-play effect (2x speed = 500ms per move), auto-exit when done
  useEffect(() => {
    if (isPlaying && replayIndex < replayActions.length) {
      replayIntervalRef.current = setTimeout(() => {
        stepForward();
      }, 500); // 2x speed
    } else if (isPlaying && replayIndex >= replayActions.length) {
      // Auto-exit replay when finished
      exitReplay();
    }
    return () => {
      if (replayIntervalRef.current) {
        clearTimeout(replayIntervalRef.current);
      }
    };
  }, [isPlaying, replayIndex, replayActions.length, stepForward]);

  const clearBoard = async () => {
    if (!privateKey || !gameId) return;
    try {
      const res = await fetch(`/api/crazy/${gameId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to clear board');
        setTimeout(() => setError(null), 3000);
        return;
      }
      const data = await res.json();
      setGame(prev => prev ? {
        ...prev,
        boardState: data.boardState,
        blackPotCount: data.blackPotCount,
        whitePotCount: data.whitePotCount,
        brownPotCount: data.brownPotCount,
        greyPotCount: data.greyPotCount,
        blackCaptured: data.blackCaptured,
        whiteCaptured: data.whiteCaptured,
        brownCaptured: data.brownCaptured,
        greyCaptured: data.greyCaptured,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
        currentTurn: data.currentTurn,
        moveNumber: data.moveNumber,
      } : null);
      setHeldStone(null);
    } catch (err) {
      console.error('Error clearing board:', err);
      setError('Failed to clear board');
      setTimeout(() => setError(null), 3000);
    }
  };

  const undoMove = async () => {
    if (!privateKey || !gameId) return;
    try {
      const res = await fetch(`/api/crazy/${gameId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to undo');
        setTimeout(() => setError(null), 3000);
        return;
      }
      const data = await res.json();
      setGame(prev => prev ? {
        ...prev,
        boardState: data.boardState,
        blackPotCount: data.blackPotCount,
        whitePotCount: data.whitePotCount,
        brownPotCount: data.brownPotCount,
        greyPotCount: data.greyPotCount,
        blackCaptured: data.blackCaptured,
        whiteCaptured: data.whiteCaptured,
        brownCaptured: data.brownCaptured,
        greyCaptured: data.greyCaptured,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
        currentTurn: data.currentTurn,
        moveNumber: data.moveNumber,
      } : null);
      setHeldStone(null);
    } catch (err) {
      console.error('Error undoing move:', err);
      setError('Failed to undo');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (showKeyModal && !privateKey) {
    return (
      <div className={`flex items-center justify-center p-4 ${isDesktop ? 'min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800' : 'h-dvh bg-black'}`}>
        <div className={`rounded-2xl shadow-xl p-8 max-w-md w-full ${isDesktop ? 'bg-white dark:bg-zinc-800' : 'bg-zinc-900'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDesktop ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-100'}`}>Access Denied</h2>
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste Board URL to Access"
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()}
          />
          <div className="flex gap-3">
            <button onClick={handleKeySubmit} className="flex-1 py-3 bg-white text-zinc-800 border border-zinc-300 rounded-lg font-semibold hover:bg-zinc-100 transition-colors">
              Join Board
            </button>
            <button onClick={() => router.push('/crazy')} className="flex-1 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-lg font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${isDesktop ? 'min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800' : 'h-dvh bg-black'}`}>
        <div className={`text-xl ${isDesktop ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400'}`}>Loading board...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className={`flex items-center justify-center ${isDesktop ? 'min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800' : 'h-dvh bg-black'}`}>
        <div className={`rounded-2xl shadow-xl p-8 max-w-md text-center ${isDesktop ? 'bg-white dark:bg-zinc-800' : 'bg-zinc-900'}`}>
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button onClick={() => router.push('/crazy')} className={`px-6 py-3 rounded-lg font-semibold transition-colors ${isDesktop ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-800 hover:bg-zinc-700 dark:hover:bg-zinc-200' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'}`}>
            Home
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  // Top buttons for CrazyGoBoard perimeter - black bold text (same as normal Go)
  // Menu stays the same during replay
  const topButtons = (
    <>
      <button
        onClick={() => router.push('/crazy')}
        className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity"
      >
        Home
      </button>
      <button
        onClick={startReplay}
        className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity"
      >
        REPLAY
      </button>
      <button
        onClick={undoMove}
        className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity"
      >
        UNDO
      </button>
      <button
        onClick={clearBoard}
        className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity"
      >
        CLEAR
      </button>
      <button
        onClick={handleShare}
        className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity"
      >
        {copied ? 'COPIED!' : 'SHARE'}
      </button>
    </>
  );

  return (
    <div className={isDesktop ? 'min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800' : 'bg-black h-dvh flex flex-col'}>
      <div className={isDesktop ? 'container mx-auto px-2 sm:px-4 pt-12 sm:pt-16 pb-4 sm:pb-8' : 'flex-1 flex flex-col justify-center px-2'}>
        {/* Buttons are now rendered inside CrazyGoBoard perimeter */}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Game Board with 4 Stone Pots - layout stays the same during replay */}
        {isDesktop ? (
          /* Desktop: 2 pots on each side */
          <div className="relative flex items-center justify-center">
            <div className="relative">
              <CrazyGoBoard
                board={isReplayMode && replayBoard ? replayBoard : game.boardState}
                size={isReplayMode ? replayBoardSize : game.boardSize}
                heldStone={isReplayMode ? null : heldStone}
                lastMove={isReplayMode ? null : (game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null)}
                onBoardClick={isReplayMode ? () => {} : handleBoardClick}
                topButtons={topButtons}
              />
              {/* Left pots (White & Brown) */}
              <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-4" style={{ right: 'calc(100% + 20px)' }}>
                <CrazyStonePot color={1} potCount={game.whitePotCount} captured={game.whiteCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 1} onClick={() => handlePotClick(1)} />
                <CrazyStonePot color={2} potCount={game.brownPotCount} captured={game.brownCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 2} onClick={() => handlePotClick(2)} />
              </div>
              {/* Right pots (Black & Grey) */}
              <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-4" style={{ left: 'calc(100% + 20px)' }}>
                <CrazyStonePot color={0} potCount={game.blackPotCount} captured={game.blackCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 0} onClick={() => handlePotClick(0)} />
                <CrazyStonePot color={3} potCount={game.greyPotCount} captured={game.greyCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 3} onClick={() => handlePotClick(3)} />
              </div>
            </div>
          </div>
        ) : deviceType === 'tablet' ? (
          /* Tablet: Pots on top and bottom */
          <div className="relative flex flex-col items-center">
            <div className="relative">
              {/* Top pots (White & Brown) */}
              <div className="absolute left-1/2 -translate-x-1/2 flex gap-4" style={{ bottom: 'calc(100% + 20px)' }}>
                <CrazyStonePot color={1} potCount={game.whitePotCount} captured={game.whiteCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 1} onClick={() => handlePotClick(1)} />
                <CrazyStonePot color={2} potCount={game.brownPotCount} captured={game.brownCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 2} onClick={() => handlePotClick(2)} />
              </div>
              <CrazyGoBoard
                board={isReplayMode && replayBoard ? replayBoard : game.boardState}
                size={isReplayMode ? replayBoardSize : game.boardSize}
                heldStone={isReplayMode ? null : heldStone}
                lastMove={isReplayMode ? null : (game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null)}
                onBoardClick={isReplayMode ? () => {} : handleBoardClick}
                topButtons={topButtons}
              />
              {/* Bottom pots (Black & Grey) */}
              <div className="absolute left-1/2 -translate-x-1/2 flex gap-4" style={{ top: 'calc(100% + 20px)' }}>
                <CrazyStonePot color={0} potCount={game.blackPotCount} captured={game.blackCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 0} onClick={() => handlePotClick(0)} />
                <CrazyStonePot color={3} potCount={game.greyPotCount} captured={game.greyCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 3} onClick={() => handlePotClick(3)} />
              </div>
            </div>
          </div>
        ) : (
          /* Mobile: All 4 pots at bottom */
          <div className="flex flex-col items-center">
            <CrazyGoBoard
              board={isReplayMode && replayBoard ? replayBoard : game.boardState}
              size={isReplayMode ? replayBoardSize : game.boardSize}
              heldStone={isReplayMode ? null : heldStone}
              lastMove={isReplayMode ? null : (game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null)}
              onBoardClick={isReplayMode ? () => {} : handleBoardClick}
              topButtons={topButtons}
            />
            <div className="flex gap-3 mt-4">
              <CrazyStonePot color={0} potCount={game.blackPotCount} captured={game.blackCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 0} small={true} onClick={() => handlePotClick(0)} />
              <CrazyStonePot color={1} potCount={game.whitePotCount} captured={game.whiteCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 1} small={true} onClick={() => handlePotClick(1)} />
              <CrazyStonePot color={2} potCount={game.brownPotCount} captured={game.brownCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 2} small={true} onClick={() => handlePotClick(2)} />
              <CrazyStonePot color={3} potCount={game.greyPotCount} captured={game.greyCaptured} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} isCurrentTurn={game.currentTurn === 3} small={true} onClick={() => handlePotClick(3)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
