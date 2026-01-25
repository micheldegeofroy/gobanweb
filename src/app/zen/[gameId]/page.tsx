'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ZenGoBoard, { ZenHeldStone } from '@/components/ZenGoBoard';
import ZenStonePot from '@/components/ZenStonePot';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

type ZenStone = 0 | 1 | null;
type ZenBoard = ZenStone[][];
type Position = { x: number; y: number };

interface ZenGameData {
  id: string;
  boardSize: number;
  boardState: ZenBoard;
  sharedPotCount: number;
  nextStoneColor: number;
  player1Captured: number;
  player2Captured: number;
  player3Captured: number;
  currentTurn: number;
  lastMoveX: number | null;
  lastMoveY: number | null;
  koPointX: number | null;
  koPointY: number | null;
  moveNumber: number;
  connectedUsers: number;
  publicKey: string;
  updatedAt: string;
}

interface ReplayAction {
  actionType: string;
  stoneColor: number | null;
  playerIndex: number | null;
  fromX: number | null;
  fromY: number | null;
  toX: number | null;
  toY: number | null;
  moveNumber: number;
}

// Client-side capture detection for 2-color Go
function detectAndRemoveCaptures(board: ZenBoard, placedX: number, placedY: number, placedColor: ZenStone): {
  newBoard: ZenBoard;
  totalCaptured: number;
} {
  const size = board.length;
  const newBoard = board.map(row => [...row]) as ZenBoard;
  let totalCaptured = 0;

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
          newBoard[pos.y][pos.x] = null;
          totalCaptured++;
        }
      }
    }
  }

  return { newBoard, totalCaptured };
}

// Suicide check
function wouldBeSuicide(board: ZenBoard, x: number, y: number, color: ZenStone): boolean {
  if (color === null) return false;
  const size = board.length;
  const testBoard = board.map(row => [...row]) as ZenBoard;
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

export default function ZenGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceType = useDeviceType();
  const haptic = useHapticFeedback();
  const isDesktop = deviceType === 'desktop';
  const isTablet = deviceType === 'tablet';
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

  const [game, setGame] = useState<ZenGameData | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [heldStone, setHeldStone] = useState<ZenHeldStone | null>(null);
  const hasInitialized = useRef(false);

  // Replay state
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayActions, setReplayActions] = useState<ReplayAction[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayBoard, setReplayBoard] = useState<ZenBoard | null>(null);
  const [replayBoardSize, setReplayBoardSize] = useState(19);
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTime = useRef<number>(0);
  const lastOptimisticUpdate = useRef<number>(0); // Track when optimistic update was applied

  const fetchGame = useCallback(async (gId: string, forceApply: boolean = false) => {
    const fetchStartTime = Date.now();
    try {
      const res = await fetch(`/api/zen/${gId}`);
      if (!res.ok) {
        if (res.status === 404) setError('Game not found');
        else throw new Error('Failed to fetch game');
        return null;
      }
      const data = await res.json();

      // Protect optimistic updates from being overwritten by stale poll data
      // Skip this check if forceApply is true (used after action confirmation)
      if (!forceApply) {
        const OPTIMISTIC_PROTECTION_MS = 4000; // Protect for 4s after optimistic update
        const timeSinceOptimistic = Date.now() - lastOptimisticUpdate.current;

        // If we're within the protection window, only apply if this fetch started after
        // the optimistic update AND enough time has passed for server to process
        if (timeSinceOptimistic < OPTIMISTIC_PROTECTION_MS) {
          // Don't apply - we're still protecting the optimistic update
          return data;
        }
      }

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
      localStorage.setItem(`zen_${gameId}_privateKey`, key);
      setPrivateKey(key);
      await fetchGame(gameId, true); // forceApply for initial load
      setShowKeyModal(false);
      setIsLoading(false);
    };

    if (urlKey) {
      initializeGame(urlKey);
    } else {
      const storedKey = localStorage.getItem(`zen_${gameId}_privateKey`);
      if (storedKey) {
        initializeGame(storedKey);
      } else {
        setShowKeyModal(true);
        setIsLoading(false);
      }
    }
  }, [gameId, hasCheckedUrl, urlKey, fetchGame]);

  // Poll for updates
  useEffect(() => {
    if (!game || !privateKey || !gameId) return;

    let interval: NodeJS.Timeout;
    const ACTIVE_POLL_MS = 3000;
    const HIDDEN_POLL_MS = 10000;
    const ACTION_COOLDOWN_MS = 3000;

    const pollIfReady = () => {
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
      fromX?: number;
      fromY?: number;
      toX?: number;
      toY?: number;
    }
  ) => {
    if (!privateKey || !game) return;

    lastActionTime.current = Date.now();

    try {
      const res = await fetch(`/api/zen/${gameId}/action`, {
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

      return true;
    } catch (err) {
      console.error('Error performing action:', err);
      setError('Action failed');
      setTimeout(() => setError(null), 3000);
      return false;
    }
  };

  const handlePotClick = () => {
    if (!game) return;

    if (heldStone) {
      // Return stone to pot
      if (heldStone.fromBoard) {
        performAction('remove', {
          fromX: heldStone.fromBoard.x,
          fromY: heldStone.fromBoard.y,
        });
      }
      setHeldStone(null);
      haptic.stonePlaced();
    } else {
      // Pick up a stone from the shared pot
      if (game.sharedPotCount > 0) {
        setHeldStone({ color: game.nextStoneColor as 0 | 1 });
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
          const testBoard = game.boardState.map(row => [...row]) as ZenBoard;
          testBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          if (wouldBeSuicide(testBoard, pos.x, pos.y, heldStone.color)) {
            haptic.invalidMove();
            return;
          }
          if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) {
            haptic.invalidMove();
            return;
          }

          lastActionTime.current = Date.now();

          // Optimistic update for move
          const newBoard = game.boardState.map(row => [...row]) as ZenBoard;
          newBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          newBoard[pos.y][pos.x] = heldStone.color;

          const { newBoard: boardAfterCaptures, totalCaptured } =
            detectAndRemoveCaptures(newBoard, pos.x, pos.y, heldStone.color);

          if (totalCaptured > 0) {
            haptic.capture();
          } else {
            haptic.stonePlaced();
          }

          // Mark optimistic update time to prevent stale poll responses
          lastOptimisticUpdate.current = Date.now();
          setGame(prev => prev ? {
            ...prev,
            boardState: boardAfterCaptures,
            lastMoveX: pos.x,
            lastMoveY: pos.y,
          } : null);
          setHeldStone(null);

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

          lastActionTime.current = Date.now();

          // Optimistic update - place stone and detect captures
          const newBoard = game.boardState.map(row => [...row]) as ZenBoard;
          newBoard[pos.y][pos.x] = heldStone.color;

          const { newBoard: boardAfterCaptures, totalCaptured } =
            detectAndRemoveCaptures(newBoard, pos.x, pos.y, heldStone.color);

          if (totalCaptured > 0) {
            haptic.capture();
          } else {
            haptic.stonePlaced();
          }

          // Figure out which player is placing (before turn advancement)
          const currentPlayer = game.currentTurn;

          // Mark optimistic update time to prevent stale poll responses
          lastOptimisticUpdate.current = Date.now();
          setGame(prev => prev ? {
            ...prev,
            boardState: boardAfterCaptures,
            lastMoveX: pos.x,
            lastMoveY: pos.y,
            sharedPotCount: prev.sharedPotCount - 1,
            nextStoneColor: 1 - prev.nextStoneColor,
            currentTurn: (prev.currentTurn + 1) % 3,
            player1Captured: prev.player1Captured + (currentPlayer === 0 ? totalCaptured : 0),
            player2Captured: prev.player2Captured + (currentPlayer === 1 ? totalCaptured : 0),
            player3Captured: prev.player3Captured + (currentPlayer === 2 ? totalCaptured : 0),
          } : null);
          setHeldStone(null);

          performAction('place', {
            toX: pos.x,
            toY: pos.y,
          });
        }
      }
    } else {
      if (stoneAtPos !== null) {
        setHeldStone({ color: stoneAtPos, fromBoard: pos });
        haptic.stonePickedUp();
      } else {
        // Direct placement - place stone of next color without picking up first
        const nextColor = game.nextStoneColor as 0 | 1;

        if (wouldBeSuicide(game.boardState, pos.x, pos.y, nextColor)) {
          haptic.invalidMove();
          return;
        }
        if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) {
          haptic.invalidMove();
          return;
        }

        lastActionTime.current = Date.now();

        // Optimistic update - place stone and detect captures
        const newBoard = game.boardState.map(row => [...row]) as ZenBoard;
        newBoard[pos.y][pos.x] = nextColor;

        const { newBoard: boardAfterCaptures, totalCaptured } =
          detectAndRemoveCaptures(newBoard, pos.x, pos.y, nextColor);

        if (totalCaptured > 0) {
          haptic.capture();
        } else {
          haptic.stonePlaced();
        }

        // Figure out which player is placing (before turn advancement)
        const currentPlayer = game.currentTurn;

        // Mark optimistic update time to prevent stale poll responses
        lastOptimisticUpdate.current = Date.now();
        setGame(prev => prev ? {
          ...prev,
          boardState: boardAfterCaptures,
          lastMoveX: pos.x,
          lastMoveY: pos.y,
          sharedPotCount: prev.sharedPotCount - 1,
          nextStoneColor: 1 - prev.nextStoneColor,
          currentTurn: (prev.currentTurn + 1) % 3,
          player1Captured: prev.player1Captured + (currentPlayer === 0 ? totalCaptured : 0),
          player2Captured: prev.player2Captured + (currentPlayer === 1 ? totalCaptured : 0),
          player3Captured: prev.player3Captured + (currentPlayer === 2 ? totalCaptured : 0),
        } : null);

        performAction('place', {
          toX: pos.x,
          toY: pos.y,
        });
      }
    }
  };

  const handleShare = async () => {
    if (!privateKey || !gameId) return;
    const shareUrl = `${window.location.origin}/zen/${gameId}?key=${encodeURIComponent(privateKey)}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
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
    localStorage.setItem(`zen_${gameId}_privateKey`, key);
    setPrivateKey(key);
    await fetchGame(gameId, true); // forceApply for initial load
    setShowKeyModal(false);
  };

  // Replay functions
  const createEmptyBoard = (size: number): ZenBoard => {
    return Array(size).fill(null).map(() => Array(size).fill(null));
  };

  const applyActionToBoard = (board: ZenBoard, action: ReplayAction): ZenBoard => {
    const newBoard = board.map(row => [...row]) as ZenBoard;

    if (action.actionType === 'place' && action.toX !== null && action.toY !== null) {
      newBoard[action.toY][action.toX] = action.stoneColor as ZenStone;
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
      const getGroup = (start: Position, b: ZenBoard): Position[] => {
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
      const countLiberties = (group: Position[], b: ZenBoard): number => {
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
      const res = await fetch(`/api/zen/${gameId}/replay`);
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
      setIsPlaying(true);
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

  // Auto-play effect
  useEffect(() => {
    if (isPlaying && replayIndex < replayActions.length) {
      replayIntervalRef.current = setTimeout(() => {
        stepForward();
      }, 500);
    } else if (isPlaying && replayIndex >= replayActions.length) {
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
      const res = await fetch(`/api/zen/${gameId}/clear`, {
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
        sharedPotCount: data.sharedPotCount,
        nextStoneColor: data.nextStoneColor,
        player1Captured: data.player1Captured,
        player2Captured: data.player2Captured,
        player3Captured: data.player3Captured,
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
      const res = await fetch(`/api/zen/${gameId}/undo`, {
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
        sharedPotCount: data.sharedPotCount,
        nextStoneColor: data.nextStoneColor,
        player1Captured: data.player1Captured,
        player2Captured: data.player2Captured,
        player3Captured: data.player3Captured,
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
      <div className={`flex items-center justify-center p-4 ${isDesktop ? 'min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800' : 'h-dvh bg-zinc-900'}`}>
        <div className="rounded-2xl shadow-xl p-8 max-w-md w-full bg-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-100">Access Denied</h2>
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste Board URL to Access"
            className="w-full px-4 py-3 rounded-lg border border-zinc-600 bg-zinc-700 text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()}
          />
          <div className="flex gap-3">
            <button onClick={handleKeySubmit} className="flex-1 py-3 bg-zinc-100 text-zinc-800 rounded-lg font-semibold hover:bg-white transition-colors">
              Join Board
            </button>
            <button onClick={() => router.push('/zen')} className="flex-1 py-3 bg-zinc-700 text-zinc-100 rounded-lg font-semibold hover:bg-zinc-600 transition-colors">
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${isDesktop ? 'min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800' : 'h-dvh bg-zinc-900'}`}>
        <div className="text-xl text-zinc-400">Loading board...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className={`flex items-center justify-center ${isDesktop ? 'min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800' : 'h-dvh bg-zinc-900'}`}>
        <div className="rounded-2xl shadow-xl p-8 max-w-md text-center bg-zinc-800">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button onClick={() => router.push('/zen')} className="px-6 py-3 rounded-lg font-semibold transition-colors bg-zinc-100 text-zinc-800 hover:bg-white">
            Home
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  // Top buttons for ZenGoBoard perimeter - grayscale text
  const topButtons = (
    <>
      <button
        onClick={() => router.push('/zen')}
        className="text-zinc-300 font-bold text-sm uppercase hover:text-white transition-colors"
      >
        Home
      </button>
      <button
        onClick={startReplay}
        className="text-zinc-300 font-bold text-sm uppercase hover:text-white transition-colors"
      >
        REPLAY
      </button>
      <button
        onClick={undoMove}
        className="text-zinc-300 font-bold text-sm uppercase hover:text-white transition-colors"
      >
        UNDO
      </button>
      <button
        onClick={handleShare}
        className="text-zinc-300 font-bold text-sm uppercase hover:text-white transition-colors"
      >
        {copied ? 'COPIED!' : 'SHARE'}
      </button>
    </>
  );

  return (
    <div className={isDesktop ? 'min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800' : 'bg-zinc-900 h-dvh flex flex-col'}>
      <div className={isDesktop ? 'container mx-auto px-2 sm:px-4 pt-12 sm:pt-16 pb-4 sm:pb-8' : 'flex-1 flex flex-col justify-center px-2'}>
        {/* Game Board with Shared Pot */}
        {isDesktop ? (
          /* Desktop: Pot on the right side */
          <div className="relative flex items-center justify-center">
            <div className="relative">
              <ZenGoBoard
                board={isReplayMode && replayBoard ? replayBoard : game.boardState}
                size={isReplayMode ? replayBoardSize : game.boardSize}
                heldStone={isReplayMode ? null : heldStone}
                lastMove={isReplayMode ? null : (game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null)}
                onBoardClick={isReplayMode ? () => {} : handleBoardClick}
                topButtons={topButtons}
              />
              {/* Pot on the right */}
              <div className="absolute top-1/2 -translate-y-1/2" style={{ left: 'calc(100% + 30px)' }}>
                <ZenStonePot
                  potCount={game.sharedPotCount}
                  nextStoneColor={game.nextStoneColor as 0 | 1}
                  currentPlayerIndex={game.currentTurn}
                  isHoldingStone={heldStone !== null}
                  heldStoneColor={heldStone?.color ?? null}
                  playerCaptures={[game.player1Captured, game.player2Captured, game.player3Captured]}
                  onClick={handlePotClick}
                />
              </div>
            </div>
          </div>
        ) : isTablet ? (
          /* Tablet: Pot above the board */
          <div className="relative flex flex-col items-center">
            <div className="relative">
              {/* Pot above board */}
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 'calc(100% + 20px)' }}>
                <ZenStonePot
                  potCount={game.sharedPotCount}
                  nextStoneColor={game.nextStoneColor as 0 | 1}
                  currentPlayerIndex={game.currentTurn}
                  isHoldingStone={heldStone !== null}
                  heldStoneColor={heldStone?.color ?? null}
                  playerCaptures={[game.player1Captured, game.player2Captured, game.player3Captured]}
                  onClick={handlePotClick}
                />
              </div>
              <ZenGoBoard
                board={isReplayMode && replayBoard ? replayBoard : game.boardState}
                size={isReplayMode ? replayBoardSize : game.boardSize}
                heldStone={isReplayMode ? null : heldStone}
                lastMove={isReplayMode ? null : (game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null)}
                onBoardClick={isReplayMode ? () => {} : handleBoardClick}
                topButtons={topButtons}
              />
            </div>
          </div>
        ) : (
          /* Mobile: Pot at bottom */
          <div className="flex flex-col items-center">
            <ZenGoBoard
              board={isReplayMode && replayBoard ? replayBoard : game.boardState}
              size={isReplayMode ? replayBoardSize : game.boardSize}
              heldStone={isReplayMode ? null : heldStone}
              lastMove={isReplayMode ? null : (game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null)}
              onBoardClick={isReplayMode ? () => {} : handleBoardClick}
              topButtons={topButtons}
            />
            <div className="mt-4">
              <ZenStonePot
                potCount={game.sharedPotCount}
                nextStoneColor={game.nextStoneColor as 0 | 1}
                currentPlayerIndex={game.currentTurn}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                playerCaptures={[game.player1Captured, game.player2Captured, game.player3Captured]}
                small
                onClick={handlePotClick}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
