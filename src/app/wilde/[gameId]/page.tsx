'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WildeGoBoard, { WildeHeldStone } from '@/components/WildeGoBoard';
import WildeStonePot from '@/components/WildeStonePot';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { WildeRulesModal } from '@/components/WildeRulesModal';
import { StonePot } from '@/lib/db/schema';
import { createEmptyBoard } from '@/lib/wilde/colors';
import {
  Pacman,
  PacmanType,
  Direction,
  PacmanPosition,
  getNextPosition,
  chooseDirection,
  playPacmanMusic,
  playEatSound,
} from '@/lib/wilde/pacman';

type WildeStone = number | null;
type WildeBoard = WildeStone[][];
type Position = { x: number; y: number };

interface WildeGameData {
  id: string;
  boardWidth: number;
  boardHeight: number;
  playerCount: number;
  boardState: WildeBoard;
  stonePots: StonePot[];
  lastMoveX: number | null;
  lastMoveY: number | null;
  koPointX: number | null;
  koPointY: number | null;
  currentTurn: number;
  pacmanMode: boolean;
  customHues: Record<number, number> | null;
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

// Client-side capture detection for N-player Go
function detectAndRemoveCaptures(board: WildeBoard, placedX: number, placedY: number, placedColor: number, width: number, height: number, playerCount: number): {
  newBoard: WildeBoard;
  capturedByColor: number[];
} {
  const newBoard = board.map(row => [...row]) as WildeBoard;
  const capturedByColor = Array(playerCount).fill(0);

  const getAdjacent = (pos: Position): Position[] => {
    const adj: Position[] = [];
    if (pos.x > 0) adj.push({ x: pos.x - 1, y: pos.y });
    if (pos.x < width - 1) adj.push({ x: pos.x + 1, y: pos.y });
    if (pos.y > 0) adj.push({ x: pos.x, y: pos.y - 1 });
    if (pos.y < height - 1) adj.push({ x: pos.x, y: pos.y + 1 });
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

  // Check adjacent opponent groups
  for (const adj of getAdjacent({ x: placedX, y: placedY })) {
    const adjColor = newBoard[adj.y][adj.x];
    if (adjColor !== null && adjColor !== placedColor) {
      const group = getGroup(adj);
      if (countLiberties(group) === 0) {
        for (const pos of group) {
          const capturedColor = newBoard[pos.y][pos.x];
          if (capturedColor !== null && capturedColor < playerCount) {
            capturedByColor[capturedColor]++;
          }
          newBoard[pos.y][pos.x] = null;
        }
      }
    }
  }

  return { newBoard, capturedByColor };
}

// N-player suicide check
function wouldBeSuicide(board: WildeBoard, x: number, y: number, color: number, width: number, height: number): boolean {
  const testBoard = board.map(row => [...row]) as WildeBoard;
  testBoard[y][x] = color;

  const getAdjacent = (pos: Position): Position[] => {
    const adj: Position[] = [];
    if (pos.x > 0) adj.push({ x: pos.x - 1, y: pos.y });
    if (pos.x < width - 1) adj.push({ x: pos.x + 1, y: pos.y });
    if (pos.y > 0) adj.push({ x: pos.x, y: pos.y - 1 });
    if (pos.y < height - 1) adj.push({ x: pos.x, y: pos.y + 1 });
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

export default function WildeGamePage({ params }: { params: Promise<{ gameId: string }> }) {
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

  const [game, setGame] = useState<WildeGameData | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [heldStone, setHeldStone] = useState<WildeHeldStone | null>(null);
  const hasInitialized = useRef(false);

  // Rules modal state
  const [showRules, setShowRules] = useState(false);

  // Replay state
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayActions, setReplayActions] = useState<ReplayAction[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayBoard, setReplayBoard] = useState<WildeBoard | null>(null);
  const [replayWidth, setReplayWidth] = useState(19);
  const [replayHeight, setReplayHeight] = useState(19);
  const [replayPlayerCount, setReplayPlayerCount] = useState(2);
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pacman state
  const [pacmanActive, setPacmanActive] = useState(false);
  const [pacmanPosition, setPacmanPosition] = useState<PacmanPosition | null>(null);
  const [pacmanType, setPacmanType] = useState<PacmanType>('pacman');
  const pacmanSpawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pacmanMoveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pacmanPositionRef = useRef<PacmanPosition | null>(null);
  const pacmanActiveRef = useRef(false);
  const gameRef = useRef<WildeGameData | null>(null);
  const privateKeyRef = useRef<string | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastActionTime = useRef<number>(0); // Track when last action was performed

  // Keep refs in sync with state (single effect for all ref updates)
  useEffect(() => {
    pacmanPositionRef.current = pacmanPosition;
    pacmanActiveRef.current = pacmanActive;
    gameRef.current = game;
    privateKeyRef.current = privateKey;
    gameIdRef.current = gameId;
  }, [pacmanPosition, pacmanActive, game, privateKey, gameId]);

  const fetchGame = useCallback(async (gId: string) => {
    try {
      const res = await fetch(`/api/wilde/${gId}`);
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
      localStorage.setItem(`wilde_${gameId}_privateKey`, key);
      setPrivateKey(key);
      await fetchGame(gameId);
      setShowKeyModal(false);
      setIsLoading(false);
    };

    if (urlKey) {
      initializeGame(urlKey);
    } else {
      const storedKey = localStorage.getItem(`wilde_${gameId}_privateKey`);
      if (storedKey) {
        initializeGame(storedKey);
      } else {
        setShowKeyModal(true);
        setIsLoading(false);
      }
    }
  }, [gameId, hasCheckedUrl, urlKey, fetchGame]);

  // Poll for game updates (slower when tab is hidden, skip after recent actions)
  useEffect(() => {
    if (!privateKey || !gameId) return;

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
  }, [privateKey, gameId, fetchGame]);

  const performAction = useCallback(async (
    actionType: 'place' | 'remove' | 'move',
    options: {
      stoneColor?: number;
      fromX?: number;
      fromY?: number;
      toX?: number;
      toY?: number;
    }
  ) => {
    if (!privateKey || !gameId) return;

    // Mark action time to prevent polling from overwriting with stale data
    lastActionTime.current = Date.now();

    try {
      const res = await fetch(`/api/wilde/${gameId}/action`, {
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
  }, [privateKey, gameId]);

  const handlePotClick = useCallback((color: number) => {
    if (!game) return;
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
      // Only allow picking up stone if it's this player's turn
      if (color !== game.currentTurn) return;
      const pot = game.stonePots[color];
      if (pot && pot.potCount > 0) {
        setHeldStone({ color });
        haptic.stonePickedUp();
      }
    }
  }, [game, heldStone, performAction, haptic]);

  const handleBoardClick = (pos: Position) => {
    if (!game) return;
    const stoneAtPos = game.boardState[pos.y][pos.x];

    if (heldStone) {
      if (stoneAtPos === null) {
        if (heldStone.fromBoard) {
          // Moving a stone on the board
          const testBoard = game.boardState.map(row => [...row]) as WildeBoard;
          testBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          if (wouldBeSuicide(testBoard, pos.x, pos.y, heldStone.color, game.boardWidth, game.boardHeight)) {
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
          const newBoard = game.boardState.map(row => [...row]) as WildeBoard;
          newBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          newBoard[pos.y][pos.x] = heldStone.color;

          const { newBoard: boardAfterCaptures, capturedByColor } =
            detectAndRemoveCaptures(newBoard, pos.x, pos.y, heldStone.color, game.boardWidth, game.boardHeight, game.playerCount);

          // Haptic feedback
          const totalCaptured = capturedByColor.reduce((sum, c) => sum + c, 0);
          if (totalCaptured > 0) {
            haptic.capture();
          } else {
            haptic.stonePlaced();
          }

          // Update captured counts and onBoard counts
          const newPots = game.stonePots.map((pot, i) => ({
            ...pot,
            captured: pot.captured + (i === heldStone.color ? totalCaptured : 0),
            onBoard: pot.onBoard - capturedByColor[i],
          }));

          setGame(prev => prev ? {
            ...prev,
            boardState: boardAfterCaptures,
            lastMoveX: pos.x,
            lastMoveY: pos.y,
            stonePots: newPots,
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
          // Check turn order silently
          if (heldStone.color !== game.currentTurn) return;
          if (wouldBeSuicide(game.boardState, pos.x, pos.y, heldStone.color, game.boardWidth, game.boardHeight)) {
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
          const newBoard = game.boardState.map(row => [...row]) as WildeBoard;
          newBoard[pos.y][pos.x] = heldStone.color;

          const { newBoard: boardAfterCaptures, capturedByColor } =
            detectAndRemoveCaptures(newBoard, pos.x, pos.y, heldStone.color, game.boardWidth, game.boardHeight, game.playerCount);

          // Haptic feedback
          const totalCaptured = capturedByColor.reduce((sum, c) => sum + c, 0);
          if (totalCaptured > 0) {
            haptic.capture();
          } else {
            haptic.stonePlaced();
          }

          // Update pot counts, captured counts, and onBoard counts
          const newPots = game.stonePots.map((pot, i) => ({
            potCount: pot.potCount - (i === heldStone.color ? 1 : 0),
            captured: pot.captured + (i === heldStone.color ? totalCaptured : 0),
            onBoard: pot.onBoard + (i === heldStone.color ? 1 : 0) - capturedByColor[i],
          }));

          setGame(prev => prev ? {
            ...prev,
            boardState: boardAfterCaptures,
            lastMoveX: pos.x,
            lastMoveY: pos.y,
            stonePots: newPots,
            currentTurn: (prev.currentTurn + 1) % prev.playerCount,
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
    const shareUrl = `${window.location.origin}/wilde/${gameId}?key=${encodeURIComponent(privateKey)}`;

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
    } catch {
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
    localStorage.setItem(`wilde_${gameId}_privateKey`, key);
    setPrivateKey(key);
    await fetchGame(gameId);
    setShowKeyModal(false);
  };

  // Replay functions
  const applyActionToBoard = (board: WildeBoard, action: ReplayAction, width: number, height: number): WildeBoard => {
    const newBoard = board.map(row => [...row]) as WildeBoard;

    if (action.actionType === 'place' && action.toX !== null && action.toY !== null) {
      newBoard[action.toY][action.toX] = action.stoneColor;
      // Simple capture detection
      const getAdjacent = (x: number, y: number): Position[] => {
        const adj: Position[] = [];
        if (x > 0) adj.push({ x: x - 1, y });
        if (x < width - 1) adj.push({ x: x + 1, y });
        if (y > 0) adj.push({ x, y: y - 1 });
        if (y < height - 1) adj.push({ x, y: y + 1 });
        return adj;
      };
      const getGroup = (start: Position, b: WildeBoard): Position[] => {
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
      const countLiberties = (group: Position[], b: WildeBoard): number => {
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
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
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
      const res = await fetch(`/api/wilde/${gameId}/replay`);
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
      setReplayWidth(data.boardWidth);
      setReplayHeight(data.boardHeight);
      setReplayPlayerCount(data.playerCount);
      setReplayBoard(createEmptyBoard(data.boardWidth, data.boardHeight));
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
      const newBoard = applyActionToBoard(replayBoard, replayActions[replayIndex], replayWidth, replayHeight);
      setReplayBoard(newBoard);
      setReplayIndex(prev => prev + 1);
    }
  }, [replayIndex, replayActions, replayBoard, replayWidth, replayHeight]);

  const stepBackward = () => {
    if (replayIndex > 0) {
      let board = createEmptyBoard(replayWidth, replayHeight);
      for (let i = 0; i < replayIndex - 1; i++) {
        board = applyActionToBoard(board, replayActions[i], replayWidth, replayHeight);
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

  // Auto-play effect - auto-exit when done
  useEffect(() => {
    if (isPlaying && replayIndex < replayActions.length) {
      replayIntervalRef.current = setTimeout(() => {
        stepForward();
      }, 500);
    } else if (isPlaying && replayIndex >= replayActions.length) {
      exitReplay(); // Auto-exit when finished
    }
    return () => {
      if (replayIntervalRef.current) {
        clearTimeout(replayIntervalRef.current);
      }
    };
  }, [isPlaying, replayIndex, replayActions.length, stepForward]);

  // Pacman spawn function - uses refs to avoid recreating on every game poll
  const spawnPacman = useCallback(() => {
    const currentGame = gameRef.current;
    if (!currentGame) return;

    // Choose random Pacman, Ms. Pacman, or Baby Pacman
    const rand = Math.random();
    const type: PacmanType = rand < 0.33 ? 'pacman' : rand < 0.66 ? 'msPacman' : 'babyPacman';
    setPacmanType(type);

    // Choose random starting edge and direction
    const edge = Math.floor(Math.random() * 4);
    let startX: number, startY: number;
    let direction: Direction;

    switch (edge) {
      case 0: // Top edge, going down
        startX = Math.floor(Math.random() * currentGame.boardWidth);
        startY = 0;
        direction = 'down';
        break;
      case 1: // Right edge, going left
        startX = currentGame.boardWidth - 1;
        startY = Math.floor(Math.random() * currentGame.boardHeight);
        direction = 'left';
        break;
      case 2: // Bottom edge, going up
        startX = Math.floor(Math.random() * currentGame.boardWidth);
        startY = currentGame.boardHeight - 1;
        direction = 'up';
        break;
      default: // Left edge, going right
        startX = 0;
        startY = Math.floor(Math.random() * currentGame.boardHeight);
        direction = 'right';
        break;
    }

    setPacmanPosition({ x: startX, y: startY, direction });
    setPacmanActive(true);
    playPacmanMusic();
  }, []);

  // Pacman spawn timer - schedules spawns when pacmanMode is enabled and no pacman is active
  useEffect(() => {
    if (!game?.pacmanMode || isReplayMode || pacmanActive) return;

    // Schedule spawn after 10 minutes ± 7 minutes (3-17 minutes)
    // Base: 10 min = 600000ms, variation: ±7 min = ±420000ms
    const baseDelay = 600000; // 10 minutes
    const variation = 420000; // 7 minutes
    const delay = baseDelay + (Math.random() * 2 - 1) * variation; // 180000 to 1020000ms
    pacmanSpawnTimerRef.current = setTimeout(() => {
      // Use ref to get current value, not stale closure value
      if (!pacmanActiveRef.current) {
        spawnPacman();
      }
    }, delay);

    return () => {
      if (pacmanSpawnTimerRef.current) {
        clearTimeout(pacmanSpawnTimerRef.current);
      }
    };
  }, [game?.pacmanMode, isReplayMode, pacmanActive, spawnPacman]);

  // Pacman movement effect
  useEffect(() => {
    if (!pacmanActive) return;

    let steps = 0;

    const movePacman = async () => {
      // Get fresh values from refs
      const currentPos = pacmanPositionRef.current;
      const currentGame = gameRef.current;
      const currentPrivateKey = privateKeyRef.current;
      const currentGameId = gameIdRef.current;

      if (!currentPos || !currentGame) return;

      const maxSteps = Math.max(currentGame.boardWidth, currentGame.boardHeight) * 2;
      steps++;

      // Check if Pacman is at current position and there's a stone
      const currentStone = currentGame.boardState[currentPos.y]?.[currentPos.x];
      if (currentStone !== null && currentStone !== undefined) {
        // Eat the stone! Return it to the owner's pot
        playEatSound();

        // Call API to persist the change
        if (currentPrivateKey && currentGameId) {
          try {
            const res = await fetch(`/api/wilde/${currentGameId}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                privateKey: currentPrivateKey,
                actionType: 'pacman_eat',
                fromX: currentPos.x,
                fromY: currentPos.y,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              setGame(prev => prev ? {
                ...prev,
                boardState: data.boardState,
                stonePots: data.stonePots,
              } : null);
            }
          } catch {
            // Fallback to local update if API fails
            setGame(prevGame => {
              if (!prevGame) return prevGame;
              const newBoard = prevGame.boardState.map(row => [...row]) as WildeBoard;
              newBoard[currentPos.y][currentPos.x] = null;
              const newPots = prevGame.stonePots.map((pot, i) =>
                i === currentStone ? { ...pot, potCount: pot.potCount + 1, onBoard: pot.onBoard - 1 } : pot
              );
              return { ...prevGame, boardState: newBoard, stonePots: newPots };
            });
          }
        }
      }

      // Check if Pacman should exit
      if (steps >= maxSteps) {
        setPacmanActive(false);
        setPacmanPosition(null);
        return;
      }

      // Calculate next position and move
      const nextPos = getNextPosition(currentPos, currentGame.boardWidth, currentGame.boardHeight);
      const newDirection = chooseDirection(currentPos.direction, true);
      setPacmanPosition({ ...nextPos, direction: newDirection });
    };

    // Move every 300ms
    pacmanMoveTimerRef.current = setInterval(movePacman, 300);

    return () => {
      if (pacmanMoveTimerRef.current) {
        clearInterval(pacmanMoveTimerRef.current);
      }
    };
  }, [pacmanActive]);

  // Memoized pots - must be before conditional returns to maintain hook order
  const pots = useMemo(() => {
    if (!game) return [];
    const result = [];
    for (let i = 0; i < game.playerCount; i++) {
      const pot = game.stonePots[i] || { potCount: 0, captured: 0, onBoard: 0 };
      result.push(
        <WildeStonePot
          key={i}
          color={i}
          potCount={pot.potCount}
          captured={pot.captured}
          onBoard={pot.onBoard}
          isHoldingStone={heldStone !== null}
          heldStoneColor={heldStone?.color ?? null}
          isCurrentTurn={game.currentTurn === i}
          small={false}
          customHue={game.customHues?.[i] || 0}
          onClick={() => handlePotClick(i)}
        />
      );
    }
    return result;
  }, [game, heldStone, handlePotClick]);

  // Small pots for mobile
  const smallPots = useMemo(() => {
    if (!game) return [];
    const result = [];
    for (let i = 0; i < game.playerCount; i++) {
      const pot = game.stonePots[i] || { potCount: 0, captured: 0, onBoard: 0 };
      result.push(
        <WildeStonePot
          key={i}
          color={i}
          potCount={pot.potCount}
          captured={pot.captured}
          onBoard={pot.onBoard}
          isHoldingStone={heldStone !== null}
          heldStoneColor={heldStone?.color ?? null}
          isCurrentTurn={game.currentTurn === i}
          small={true}
          customHue={game.customHues?.[i] || 0}
          onClick={() => handlePotClick(i)}
        />
      );
    }
    return result;
  }, [game, heldStone, handlePotClick]);

  // Split pots for desktop layout
  const leftPots = useMemo(() => {
    if (!game) return [];
    return pots.slice(0, Math.ceil(game.playerCount / 2));
  }, [pots, game]);

  const rightPots = useMemo(() => {
    if (!game) return [];
    return pots.slice(Math.ceil(game.playerCount / 2));
  }, [pots, game]);

  const clearBoard = async () => {
    if (!privateKey || !gameId) return;
    try {
      const res = await fetch(`/api/wilde/${gameId}/clear`, {
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
        stonePots: data.stonePots,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
        currentTurn: data.currentTurn,
      } : null);
      setHeldStone(null);
    } catch (err) {
      console.error('Error clearing board:', err);
      setError('Failed to clear board');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (showKeyModal && !privateKey) {
    return (
      <div className={`flex items-center justify-center p-4 ${isDesktop ? 'min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900' : 'h-dvh bg-black'}`}>
        <div className={`rounded-2xl shadow-xl p-8 max-w-md w-full ${isDesktop ? 'bg-white dark:bg-zinc-800' : 'bg-zinc-900'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDesktop ? 'text-purple-800 dark:text-purple-100' : 'text-purple-300'}`}>Access Denied</h2>
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste Board URL to Access"
            className="w-full px-4 py-3 rounded-lg border border-purple-200 dark:border-purple-600 bg-white dark:bg-zinc-700 text-purple-800 dark:text-purple-100 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()}
          />
          <div className="flex gap-3">
            <button onClick={handleKeySubmit} className="flex-1 py-3 bg-white text-zinc-800 border border-zinc-300 rounded-lg font-semibold hover:bg-zinc-100 transition-colors">
              Join Board
            </button>
            <button onClick={() => router.push('/wilde')} className="flex-1 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-lg font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${isDesktop ? 'min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900' : 'h-dvh bg-black'}`}>
        <div className={`text-xl ${isDesktop ? 'text-purple-600 dark:text-purple-300' : 'text-purple-300'}`}>Loading board...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className={`flex items-center justify-center ${isDesktop ? 'min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900' : 'h-dvh bg-black'}`}>
        <div className={`rounded-2xl shadow-xl p-8 max-w-md text-center ${isDesktop ? 'bg-white dark:bg-zinc-800' : 'bg-zinc-900'}`}>
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button onClick={() => router.push('/wilde')} className={`px-6 py-3 rounded-lg font-semibold ${isDesktop ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-purple-500 text-white'}`}>
            Home
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const handleUndo = async () => {
    if (!privateKey || !gameId) return;
    try {
      const res = await fetch(`/api/wilde/${gameId}/undo`, {
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
        stonePots: data.stonePots,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
        currentTurn: data.currentTurn,
      } : null);
      setHeldStone(null);
    } catch (err) {
      console.error('Error undoing:', err);
      setError('Failed to undo');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Top buttons for board perimeter - same during replay
  const topButtons = (
    <>
      <button onClick={() => router.push('/wilde')} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        Home
      </button>
      <button onClick={handleUndo} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        UNDO
      </button>
      <button onClick={startReplay} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        REPLAY
      </button>
      <button onClick={clearBoard} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        CLEAR
      </button>
      <button onClick={handleShare} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        {copied ? 'COPIED!' : 'SHARE'}
      </button>
      <button onClick={() => setShowRules(true)} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        RULES
      </button>
    </>
  );

  return (
    <div className={isDesktop ? 'min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900' : 'bg-black h-dvh flex flex-col'}>
      <div className={isDesktop ? 'container mx-auto px-2 sm:px-4 pt-12 sm:pt-16 pb-4 sm:pb-8' : 'flex-1 flex flex-col justify-center px-2'}>
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Game Board with Stone Pots - pots stay visible during replay */}
        {isDesktop ? (
          <div className="relative flex items-center justify-center">
            <div className="relative">
              <WildeGoBoard
                board={isReplayMode && replayBoard ? replayBoard : game.boardState}
                width={isReplayMode ? replayWidth : game.boardWidth}
                height={isReplayMode ? replayHeight : game.boardHeight}
                playerCount={isReplayMode ? replayPlayerCount : game.playerCount}
                heldStone={isReplayMode ? null : heldStone}
                lastMove={isReplayMode ? null : (game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null)}
                onBoardClick={isReplayMode ? () => {} : handleBoardClick}
                topButtons={topButtons}
                pacman={pacmanActive && pacmanPosition ? { ...pacmanPosition, type: pacmanType } : null}
                customHues={game.customHues}
              />
              {/* Left pots */}
              <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-3" style={{ right: 'calc(100% + 20px)' }}>
                {leftPots}
              </div>
              {/* Right pots */}
              <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-3" style={{ left: 'calc(100% + 20px)' }}>
                {rightPots}
              </div>
            </div>
          </div>
        ) : isTablet ? (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex justify-center w-full">
              <WildeGoBoard
                board={isReplayMode && replayBoard ? replayBoard : game.boardState}
                width={isReplayMode ? replayWidth : game.boardWidth}
                height={isReplayMode ? replayHeight : game.boardHeight}
                playerCount={isReplayMode ? replayPlayerCount : game.playerCount}
                heldStone={isReplayMode ? null : heldStone}
                lastMove={isReplayMode ? null : (game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null)}
                onBoardClick={isReplayMode ? () => {} : handleBoardClick}
                topButtons={topButtons}
                pacman={pacmanActive && pacmanPosition ? { ...pacmanPosition, type: pacmanType } : null}
                customHues={game.customHues}
              />
            </div>
            {/* All pots at bottom in rows */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {pots}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div className="flex justify-center w-full">
              <WildeGoBoard
                board={isReplayMode && replayBoard ? replayBoard : game.boardState}
                width={isReplayMode ? replayWidth : game.boardWidth}
                height={isReplayMode ? replayHeight : game.boardHeight}
                playerCount={isReplayMode ? replayPlayerCount : game.playerCount}
                heldStone={isReplayMode ? null : heldStone}
                lastMove={isReplayMode ? null : (game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null)}
                onBoardClick={isReplayMode ? () => {} : handleBoardClick}
                topButtons={topButtons}
                pacman={pacmanActive && pacmanPosition ? { ...pacmanPosition, type: pacmanType } : null}
                customHues={game.customHues}
              />
            </div>
            {/* All pots at bottom in rows */}
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-[400px]">
              {smallPots}
            </div>
          </div>
        )}
      </div>
      <WildeRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
