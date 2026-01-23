'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GoBoard, { HeldStone } from '@/components/GoBoard';
import StonePot from '@/components/StonePot';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import type { Board, Position, Stone } from '@/lib/game/logic';
import { createEmptyBoard, detectAndRemoveCaptures, wouldBeSuicide } from '@/lib/game/logic';

interface GameAction {
  id: string;
  gameId: string;
  actionType: 'place' | 'remove' | 'move';
  stoneColor: number | null;
  fromX: number | null;
  fromY: number | null;
  toX: number | null;
  toY: number | null;
  moveNumber: number;
  explosion: {
    triggerX: number;
    triggerY: number;
    triggerColor: number;
    destroyedStones: { x: number; y: number; color: number }[];
  } | null;
  droneStrike: {
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    targetColor: number;
  } | null;
  createdAt: string;
}

interface DroneStrikeData {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetColor: number;
}

interface GameData {
  id: string;
  boardSize: number;
  boardState: Board;
  blackPotCount: number;
  whitePotCount: number;
  blackCaptured: number;
  whiteCaptured: number;
  blackOnBoard: number;
  whiteOnBoard: number;
  blackExploded: number;
  whiteExploded: number;
  blackDroned: number;
  whiteDroned: number;
  lastMoveX: number | null;
  lastMoveY: number | null;
  lastExplosionX: number | null;
  lastExplosionY: number | null;
  lastDroneTargetX: number | null;
  lastDroneTargetY: number | null;
  koPointX: number | null;
  koPointY: number | null;
  currentTurn: number;
  moveNumber: number;
  connectedUsers: number;
  publicKey: string;
  updatedAt: string;
}

export default function BangGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceType = useDeviceType();
  const haptic = useHapticFeedback();
  const isDesktop = deviceType === 'desktop';
  const isTablet = deviceType === 'tablet';
  const isMobile = deviceType === 'mobile';

  // Military camo colors
  const camoGreen = '#4B5320';
  const camoOlive = '#556B2F';
  const camoBrown = '#5C4033';
  const camoTan = '#C4A363';

  // Get gameId from params and key from query string
  const [gameId, setGameId] = useState<string | null>(null);
  const [urlKey, setUrlKey] = useState<string | null>(null);
  const [hasCheckedUrl, setHasCheckedUrl] = useState(false);

  // Initialize from params
  useEffect(() => {
    params.then(p => {
      setGameId(p.gameId);
      const keyParam = searchParams.get('key');
      setUrlKey(keyParam);
      setHasCheckedUrl(true);
    });
  }, [params, searchParams]);

  const [game, setGame] = useState<GameData | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [heldStone, setHeldStone] = useState<HeldStone | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [explosionPos, setExplosionPos] = useState<Position | null>(null);
  const [droneAnimation, setDroneAnimation] = useState<{
    path: Position[];
    progress: number;
    propRotation: number;
    targetHit: boolean;
    targetPos: Position | null;
    droneColor?: string;
  } | null>(null);
  const droneAnimationRef = useRef<number | null>(null);
  const hasInitialized = useRef(false);

  // Replay state
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayActions, setReplayActions] = useState<GameAction[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayBoard, setReplayBoard] = useState<Board | null>(null);
  const [replayLastMove, setReplayLastMove] = useState<Position | null>(null);
  const [replayExplosion, setReplayExplosion] = useState<Position | null>(null);
  const [replayDrone, setReplayDrone] = useState<{
    path: Position[];
    progress: number;
    propRotation: number;
    targetHit: boolean;
    targetPos: Position | null;
    droneColor?: string;
  } | null>(null);
  const replayDroneRef = useRef<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTime = useRef<number>(0);
  const lastOptimisticUpdate = useRef<number>(0);

  // Fetch game data
  const fetchGame = useCallback(async (gId: string, forceApply: boolean = false) => {
    try {
      const res = await fetch(`/api/bang/${gId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Game not found');
        } else {
          throw new Error('Failed to fetch game');
        }
        return null;
      }
      const data = await res.json();

      if (!forceApply) {
        const OPTIMISTIC_PROTECTION_MS = 2500;
        const timeSinceOptimistic = Date.now() - lastOptimisticUpdate.current;

        if (timeSinceOptimistic < OPTIMISTIC_PROTECTION_MS) {
          return data;
        }
      }

      setGame(data);
      setLastUpdate(data.updatedAt);
      return data;
    } catch (err) {
      console.error('Error fetching game:', err);
      return null;
    }
  }, []);

  // Initialize - check for key in URL, localStorage, or show modal
  useEffect(() => {
    if (!gameId || !hasCheckedUrl || hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeGame = async (key: string) => {
      localStorage.setItem(`bang_${gameId}_privateKey`, key);
      setPrivateKey(key);
      await fetchGame(gameId, true);
      setShowKeyModal(false);
      setIsLoading(false);
    };

    if (urlKey) {
      initializeGame(urlKey);
    } else {
      const storedKey = localStorage.getItem(`bang_${gameId}_privateKey`);
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
    const ACTIVE_POLL_MS = 2000;
    const HIDDEN_POLL_MS = 10000;
    const ACTION_COOLDOWN_MS = 1500;

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

  // Generate a random path along grid lines for drone
  const generateDronePath = useCallback((targetX: number, targetY: number, boardSize: number): Position[] => {
    const path: Position[] = [];

    // Start from a random edge
    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (edge) {
      case 0: // Top
        x = Math.floor(Math.random() * boardSize);
        y = -1;
        break;
      case 1: // Right
        x = boardSize;
        y = Math.floor(Math.random() * boardSize);
        break;
      case 2: // Bottom
        x = Math.floor(Math.random() * boardSize);
        y = boardSize;
        break;
      default: // Left
        x = -1;
        y = Math.floor(Math.random() * boardSize);
        break;
    }

    path.push({ x, y });

    // Move onto the board
    if (x < 0) x = 0;
    else if (x >= boardSize) x = boardSize - 1;
    if (y < 0) y = 0;
    else if (y >= boardSize) y = boardSize - 1;
    path.push({ x, y });

    // Generate random path along grid lines towards target
    const maxSteps = 30;
    for (let i = 0; i < maxSteps; i++) {
      // Check if we reached target
      if (x === targetX && y === targetY) {
        break;
      }

      // Decide direction - bias towards target but allow random wandering
      const directions: Position[] = [];

      // Possible moves (only along grid lines)
      if (x > 0) directions.push({ x: x - 1, y });
      if (x < boardSize - 1) directions.push({ x: x + 1, y });
      if (y > 0) directions.push({ x, y: y - 1 });
      if (y < boardSize - 1) directions.push({ x, y: y + 1 });

      // Bias towards target (70% chance to move closer)
      if (Math.random() < 0.7) {
        const towardsTarget = directions.filter(d => {
          const oldDist = Math.abs(x - targetX) + Math.abs(y - targetY);
          const newDist = Math.abs(d.x - targetX) + Math.abs(d.y - targetY);
          return newDist < oldDist;
        });
        if (towardsTarget.length > 0) {
          const chosen = towardsTarget[Math.floor(Math.random() * towardsTarget.length)];
          x = chosen.x;
          y = chosen.y;
          path.push({ x, y });
          continue;
        }
      }

      // Random move
      if (directions.length > 0) {
        const chosen = directions[Math.floor(Math.random() * directions.length)];
        x = chosen.x;
        y = chosen.y;
        path.push({ x, y });
      }
    }

    // Make sure we end at target
    if (x !== targetX || y !== targetY) {
      path.push({ x: targetX, y: targetY });
    }

    return path;
  }, []);

  // Start drone animation
  // droneColor: red (#D52B1E) for Russian drone, blue (#005BBB) for Ukrainian drone
  const startDroneAnimation = useCallback((targetX: number, targetY: number, targetHit: boolean, droneColor: string) => {
    if (!game) return;

    // Cancel any existing animation
    if (droneAnimationRef.current) {
      cancelAnimationFrame(droneAnimationRef.current);
    }

    const path = generateDronePath(targetX, targetY, game.boardSize);
    const duration = 5000 + Math.random() * 2000; // 5-7 seconds
    const startTime = Date.now();

    // Schedule explosion at the end of animation (independent of animation frame)
    if (targetHit) {
      setTimeout(() => {
        setExplosionPos({ x: targetX, y: targetY });
        haptic.capture();
        setTimeout(() => setExplosionPos(null), 1500);
      }, duration);
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const propRotation = (elapsed / 50) % (Math.PI * 2); // Fast spinning props

      setDroneAnimation({
        path,
        progress,
        propRotation,
        targetHit,
        targetPos: { x: targetX, y: targetY },
        droneColor,
      });

      if (progress < 1) {
        droneAnimationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - clear drone
        setDroneAnimation(null);
        droneAnimationRef.current = null;
      }
    };

    droneAnimationRef.current = requestAnimationFrame(animate);
  }, [game, generateDronePath, haptic]);

  // Cleanup drone animations on unmount
  useEffect(() => {
    return () => {
      if (droneAnimationRef.current) {
        cancelAnimationFrame(droneAnimationRef.current);
      }
      if (replayDroneRef.current) {
        cancelAnimationFrame(replayDroneRef.current);
      }
    };
  }, []);

  // Perform action on the server
  const performAction = async (
    actionType: 'place' | 'remove' | 'move',
    options: {
      stoneColor?: 0 | 1;
      fromX?: number;
      fromY?: number;
      toX?: number;
      toY?: number;
    }
  ) => {
    if (!privateKey || !game) return;

    lastActionTime.current = Date.now();
    lastOptimisticUpdate.current = Date.now(); // Protect against polling overwrite

    try {
      const res = await fetch(`/api/bang/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privateKey,
          actionType,
          ...options,
        }),
      });

      if (!res.ok) {
        return { success: false, explosion: false };
      }

      const data = await res.json();

      // Update game state from server response
      lastOptimisticUpdate.current = Date.now(); // Refresh protection after update
      setGame(prev => prev ? {
        ...prev,
        boardState: data.boardState,
        blackPotCount: data.blackPotCount,
        whitePotCount: data.whitePotCount,
        blackCaptured: data.blackCaptured,
        whiteCaptured: data.whiteCaptured,
        blackOnBoard: data.blackOnBoard,
        whiteOnBoard: data.whiteOnBoard,
        blackExploded: data.blackExploded,
        whiteExploded: data.whiteExploded,
        blackDroned: data.blackDroned,
        whiteDroned: data.whiteDroned,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        lastExplosionX: data.lastExplosionX,
        lastExplosionY: data.lastExplosionY,
        lastDroneTargetX: data.lastDroneTargetX,
        lastDroneTargetY: data.lastDroneTargetY,
        currentTurn: data.currentTurn,
      } : null);

      // Show temporary explosion animation if triggered
      if (data.explosion) {
        setExplosionPos({ x: data.lastExplosionX, y: data.lastExplosionY });
        haptic.capture(); // Use capture haptic for explosion
        setTimeout(() => setExplosionPos(null), 1500); // Clear after animation
      }

      // Show drone animation if triggered
      // Drone is from the enemy: if targeting black (Russia), drone is Ukrainian (blue)
      // If targeting white (Ukraine), drone is Russian (red)
      if (data.droneStrike) {
        const droneColor = data.droneStrike.targetColor === 0 ? '#005BBB' : '#D52B1E';
        startDroneAnimation(
          data.droneStrike.targetX,
          data.droneStrike.targetY,
          true,
          droneColor
        );
      }

      return { success: true, explosion: data.explosion, droneStrike: data.droneStrike };
    } catch (err) {
      console.error('Error performing action:', err);
      return { success: false, explosion: false };
    }
  };

  // Handle clicking on a stone pot
  const handlePotClick = (color: 0 | 1) => {
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
      // Silently reject if not this player's turn
      if (game?.currentTurn !== color) return;

      const potCount = color === 0 ? game?.blackPotCount : game?.whitePotCount;
      if ((potCount ?? 0) > 0) {
        setHeldStone({ color });
        haptic.stonePickedUp();
      }
    }
  };

  // Handle clicking on the board
  const handleBoardClick = (pos: Position) => {
    if (!game) return;

    const stoneAtPos = game.boardState[pos.y][pos.x];

    if (heldStone) {
      if (stoneAtPos === null) {
        if (heldStone.fromBoard) {
          // Moving a stone - check for suicide (but not ko since explosion might happen)
          const testBoard = game.boardState.map(row => [...row]);
          testBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          if (wouldBeSuicide(testBoard, pos.x, pos.y, heldStone.color)) {
            haptic.invalidMove();
            return;
          }

          setHeldStone(null);
          haptic.stonePlaced();
          performAction('move', {
            fromX: heldStone.fromBoard.x,
            fromY: heldStone.fromBoard.y,
            toX: pos.x,
            toY: pos.y,
          });
        } else {
          // Placing a new stone - check for suicide
          if (wouldBeSuicide(game.boardState, pos.x, pos.y, heldStone.color)) {
            haptic.invalidMove();
            return;
          }

          setHeldStone(null);
          haptic.stonePlaced();
          performAction('place', {
            stoneColor: heldStone.color,
            toX: pos.x,
            toY: pos.y,
          });
        }
      }
    } else {
      if (stoneAtPos !== null) {
        setHeldStone({
          color: stoneAtPos as 0 | 1,
          fromBoard: pos,
        });
        haptic.stonePickedUp();
      }
    }
  };

  // Share - copy URL with key to clipboard
  const handleShare = async () => {
    if (!privateKey || !gameId) return;
    const shareUrl = `${window.location.origin}/bang/${gameId}?key=${encodeURIComponent(privateKey)}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
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
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Submit key from modal
  const handleKeySubmit = async () => {
    if (!keyInput.trim() || !gameId) return;
    const input = keyInput.trim();

    let key = input;

    try {
      if (input.includes('://') || input.includes('key=')) {
        const url = new URL(input.includes('://') ? input : `https://dummy.com?${input}`);
        const urlKey = url.searchParams.get('key');
        if (urlKey) {
          key = urlKey;
        }
      }
    } catch {
      // Not a valid URL, use input as-is
    }

    localStorage.setItem(`bang_${gameId}_privateKey`, key);
    setPrivateKey(key);
    await fetchGame(gameId, true);
    setShowKeyModal(false);
  };

  // Replay functions
  const computeBoardAtStep = useCallback((actions: GameAction[], step: number, boardSize: number): {
    board: Board;
    lastMove: Position | null;
    currentAction: GameAction | null;
  } => {
    let board = createEmptyBoard(boardSize);
    let lastMove: Position | null = null;

    for (let i = 0; i < step; i++) {
      const action = actions[i];

      switch (action.actionType) {
        case 'place':
          if (action.toX !== null && action.toY !== null && action.stoneColor !== null) {
            board[action.toY][action.toX] = action.stoneColor as Stone;
            lastMove = { x: action.toX, y: action.toY };
          }
          break;
        case 'remove':
          if (action.fromX !== null && action.fromY !== null) {
            board[action.fromY][action.fromX] = null;
          }
          break;
        case 'move':
          if (action.fromX !== null && action.fromY !== null && action.toX !== null && action.toY !== null) {
            const stone = board[action.fromY][action.fromX];
            board[action.fromY][action.fromX] = null;
            board[action.toY][action.toX] = stone;
            lastMove = { x: action.toX, y: action.toY };
          }
          break;
      }

      // Handle explosion
      if (action.explosion) {
        for (const destroyed of action.explosion.destroyedStones) {
          board[destroyed.y][destroyed.x] = null;
        }
      } else if (action.actionType === 'place' || action.actionType === 'move') {
        // Normal capture if no explosion
        const captureResult = detectAndRemoveCaptures(board);
        board = captureResult.newBoard;
      }

      // Handle drone strike
      if (action.droneStrike) {
        board[action.droneStrike.targetY][action.droneStrike.targetX] = null;
      }
    }

    // Get the action at current step (the one that just played)
    const currentAction = step > 0 ? actions[step - 1] : null;

    return { board, lastMove, currentAction };
  }, []);

  const startReplay = async () => {
    if (!gameId) return;

    try {
      const res = await fetch(`/api/bang/${gameId}/history`);
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      console.log('Replay actions:', data.actions); // Debug log
      setReplayActions(data.actions);
      setReplayIndex(0);
      setReplayBoard(createEmptyBoard(data.boardSize));
      setReplayLastMove(null);
      setReplayExplosion(null);
      setReplayDrone(null);
      setIsReplaying(true);
      setIsAutoPlaying(true);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const exitReplay = () => {
    setIsReplaying(false);
    setReplayActions([]);
    setReplayIndex(0);
    setReplayBoard(null);
    setReplayLastMove(null);
    setReplayExplosion(null);
    setReplayDrone(null);
    setIsAutoPlaying(false);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    if (replayDroneRef.current) {
      cancelAnimationFrame(replayDroneRef.current);
      replayDroneRef.current = null;
    }
  };

  const [isNuking, setIsNuking] = useState(false);

  const clearBoard = async () => {
    if (!privateKey || !gameId || !game || isNuking) return;

    lastActionTime.current = Date.now();
    lastOptimisticUpdate.current = Date.now();

    // Collect all stone positions
    const stonePositions: Position[] = [];
    for (let y = 0; y < game.boardSize; y++) {
      for (let x = 0; x < game.boardSize; x++) {
        if (game.boardState[y][x] !== null) {
          stonePositions.push({ x, y });
        }
      }
    }

    // If no stones, just clear
    if (stonePositions.length === 0) {
      return;
    }

    setIsNuking(true);

    // Animate explosions one by one
    for (let i = 0; i < stonePositions.length; i++) {
      const pos = stonePositions[i];

      // Show explosion
      setExplosionPos(pos);
      haptic.capture();

      // Wait for explosion to display
      await new Promise(resolve => setTimeout(resolve, 200));

      // Remove the stone from local state
      setGame(prev => {
        if (!prev) return prev;
        const newBoard = prev.boardState.map(row => [...row]);
        newBoard[pos.y][pos.x] = null;
        return { ...prev, boardState: newBoard };
      });

      // Brief pause before next explosion
      const delay = Math.max(30, 100 - stonePositions.length);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    setExplosionPos(null);
    setIsNuking(false);

    // Now call API to sync the cleared state
    try {
      const res = await fetch(`/api/bang/${gameId}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey }),
      });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      lastOptimisticUpdate.current = Date.now();
      setGame(prev => prev ? {
        ...prev,
        boardState: data.boardState,
        blackPotCount: data.blackPotCount,
        whitePotCount: data.whitePotCount,
        blackCaptured: data.blackCaptured,
        whiteCaptured: data.whiteCaptured,
        blackOnBoard: data.blackOnBoard,
        whiteOnBoard: data.whiteOnBoard,
        blackExploded: data.blackExploded,
        whiteExploded: data.whiteExploded,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        lastExplosionX: data.lastExplosionX,
        lastExplosionY: data.lastExplosionY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
        currentTurn: data.currentTurn,
      } : null);
      setHeldStone(null);
    } catch (err) {
      console.error('Error clearing board:', err);
    }
  };

  const undoMove = async () => {
    if (!privateKey || !gameId) return;

    lastActionTime.current = Date.now();
    lastOptimisticUpdate.current = Date.now();

    try {
      const res = await fetch(`/api/bang/${gameId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey }),
      });
      if (!res.ok) return;
      const data = await res.json();
      lastOptimisticUpdate.current = Date.now();
      setGame(prev => prev ? {
        ...prev,
        boardState: data.boardState,
        blackPotCount: data.blackPotCount,
        whitePotCount: data.whitePotCount,
        blackCaptured: data.blackCaptured,
        whiteCaptured: data.whiteCaptured,
        blackOnBoard: data.blackOnBoard,
        whiteOnBoard: data.whiteOnBoard,
        blackExploded: data.blackExploded,
        whiteExploded: data.whiteExploded,
        blackDroned: data.blackDroned,
        whiteDroned: data.whiteDroned,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        lastExplosionX: data.lastExplosionX,
        lastExplosionY: data.lastExplosionY,
        lastDroneTargetX: data.lastDroneTargetX,
        lastDroneTargetY: data.lastDroneTargetY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
        currentTurn: data.currentTurn,
      } : null);
      setHeldStone(null);
    } catch (err) {
      console.error('Error undoing move:', err);
    }
  };

  // Start replay drone animation
  const startReplayDroneAnimation = useCallback((targetX: number, targetY: number, boardSize: number, droneColor: string) => {
    // Cancel any existing animation
    if (replayDroneRef.current) {
      cancelAnimationFrame(replayDroneRef.current);
    }

    const path = generateDronePath(targetX, targetY, boardSize);
    const duration = 2000; // Faster for replay (2 seconds)
    const startTime = Date.now();

    // Schedule explosion at the end
    setTimeout(() => {
      setReplayExplosion({ x: targetX, y: targetY });
      setTimeout(() => setReplayExplosion(null), 800);
    }, duration);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const propRotation = (elapsed / 50) % (Math.PI * 2);

      setReplayDrone({
        path,
        progress,
        propRotation,
        targetHit: true,
        targetPos: { x: targetX, y: targetY },
        droneColor,
      });

      if (progress < 1) {
        replayDroneRef.current = requestAnimationFrame(animate);
      } else {
        setReplayDrone(null);
        replayDroneRef.current = null;
      }
    };

    replayDroneRef.current = requestAnimationFrame(animate);
  }, [generateDronePath]);

  // Auto-play effect
  useEffect(() => {
    if (isAutoPlaying && isReplaying && game) {
      autoPlayRef.current = setInterval(() => {
        setReplayIndex(prev => {
          if (prev >= replayActions.length) {
            setIsAutoPlaying(false);
            setIsReplaying(false);
            setReplayActions([]);
            setReplayBoard(null);
            setReplayLastMove(null);
            setReplayExplosion(null);
            setReplayDrone(null);
            return prev;
          }
          const newIndex = prev + 1;
          const { board, lastMove, currentAction } = computeBoardAtStep(replayActions, newIndex, game.boardSize);
          setReplayBoard(board);
          setReplayLastMove(lastMove);

          // Show explosion if this action had one
          if (currentAction?.explosion) {
            console.log('Replay explosion at:', currentAction.explosion.triggerX, currentAction.explosion.triggerY);
            setReplayExplosion({ x: currentAction.explosion.triggerX, y: currentAction.explosion.triggerY });
            setTimeout(() => setReplayExplosion(null), 800);
          }

          // Animate drone if this action had a drone strike
          if (currentAction?.droneStrike) {
            console.log('Replay drone strike at:', currentAction.droneStrike.targetX, currentAction.droneStrike.targetY);
            const droneColor = currentAction.droneStrike.targetColor === 0 ? '#005BBB' : '#D52B1E';
            startReplayDroneAnimation(
              currentAction.droneStrike.targetX,
              currentAction.droneStrike.targetY,
              game.boardSize,
              droneColor
            );
          }

          return newIndex;
        });
      }, 1000);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
          autoPlayRef.current = null;
        }
      };
    }
  }, [isAutoPlaying, isReplaying, replayActions, game, computeBoardAtStep, startReplayDroneAnimation]);

  // Show key input modal if no key - Military style
  if (showKeyModal && !privateKey) {
    return (
      <div
        className={`flex items-center justify-center p-4 ${isDesktop ? 'min-h-screen' : 'h-dvh'}`}
        style={{
          background: `linear-gradient(135deg, ${camoGreen} 0%, ${camoOlive} 50%, ${camoBrown} 100%)`
        }}
      >
        <div
          className="rounded-xl shadow-2xl p-8 max-w-md w-full border-4"
          style={{
            backgroundColor: '#2D2D2D',
            borderColor: camoOlive
          }}
        >
          <h2 className="text-2xl font-semibold mb-6" style={{ color: camoTan }}>
            Join Mission
          </h2>

          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste Board URL to Access"
            className="w-full px-4 py-3 rounded-lg border-2 bg-zinc-800 placeholder-gray-500 focus:outline-none focus:ring-2 mb-4"
            style={{
              color: camoTan,
              borderColor: camoOlive
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()}
          />

          <div className="flex gap-3">
            <button
              onClick={handleKeySubmit}
              className="flex-1 py-3 rounded-lg font-bold text-black transition-all hover:opacity-90 uppercase tracking-wider"
              style={{ backgroundColor: camoTan }}
            >
              Deploy
            </button>
            <button
              onClick={() => router.push('/bang')}
              className="flex-1 py-3 rounded-lg font-bold border-2 transition-colors hover:opacity-80 uppercase tracking-wider"
              style={{ borderColor: camoOlive, color: camoTan }}
            >
              Abort
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${isDesktop ? 'min-h-screen' : 'h-dvh'}`}
        style={{
          background: `linear-gradient(135deg, ${camoGreen} 0%, ${camoOlive} 50%, ${camoBrown} 100%)`
        }}
      >
        <div className="text-xl font-bold" style={{ color: camoTan }}>Deploying board...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div
        className={`flex items-center justify-center ${isDesktop ? 'min-h-screen' : 'h-dvh'}`}
        style={{
          background: `linear-gradient(135deg, ${camoGreen} 0%, ${camoOlive} 50%, ${camoBrown} 100%)`
        }}
      >
        <div
          className="rounded-xl shadow-2xl p-8 max-w-md text-center border-4"
          style={{
            backgroundColor: '#2D2D2D',
            borderColor: camoOlive
          }}
        >
          <div className="text-xl mb-4" style={{ color: camoTan }}>{error}</div>
          <button
            onClick={() => router.push('/bang')}
            className="px-6 py-3 rounded-lg font-bold text-black transition-all hover:opacity-90 uppercase"
            style={{ backgroundColor: camoTan }}
          >
            Return to Base
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  // Top buttons for GoBoard perimeter - Military style
  const topButtons = (
    <>
      <button
        onClick={() => router.push('/bang')}
        className="font-bold text-sm uppercase hover:opacity-70 transition-opacity"
        style={{ color: camoTan }}
      >
        Base
      </button>
      <button
        onClick={startReplay}
        disabled={isReplaying}
        className="font-bold text-sm uppercase hover:opacity-70 transition-opacity disabled:opacity-50"
        style={{ color: camoTan }}
      >
        {isReplaying ? 'REPLAYING' : 'REPLAY'}
      </button>
      <button
        onClick={undoMove}
        className="font-bold text-sm uppercase hover:opacity-70 transition-opacity"
        style={{ color: camoTan }}
      >
        UNDO
      </button>
      <button
        onClick={clearBoard}
        className="font-bold text-sm uppercase hover:opacity-70 transition-opacity"
        style={{ color: camoTan }}
      >
        NUKE
      </button>
      <button
        onClick={handleShare}
        className="font-bold text-sm uppercase hover:opacity-70 transition-opacity"
        style={{ color: camoTan }}
      >
        {copied ? 'COPIED!' : 'SHARE'}
      </button>
    </>
  );

  // Stats overlay for on the board
  const statsOverlay = (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1">
      <span className="text-xs font-bold whitespace-nowrap" style={{ color: camoTan }}>
        Turn: {game.currentTurn === 0 ? 'RUS' : 'UKR'} | KIA Mine B:{game.blackExploded} W:{game.whiteExploded} | KIA Drone B:{game.blackDroned} W:{game.whiteDroned}
      </span>
    </div>
  );


  return (
    <div
      className={`${isDesktop ? 'min-h-screen' : 'h-dvh flex flex-col'}`}
      style={{
        background: `linear-gradient(135deg, ${camoGreen} 0%, ${camoOlive} 50%, ${camoBrown} 100%)`
      }}
    >

      <div className={`container mx-auto px-2 sm:px-4 ${isDesktop ? 'pt-12 sm:pt-16 pb-4 sm:pb-8' : 'flex-1 flex flex-col justify-center'} ${isTablet ? 'pb-[72px]' : ''} ${isMobile ? 'pb-4' : ''}`}>


        {/* Game Board with Stone Pots */}
        {isDesktop ? (
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <div className="relative">
              <GoBoard
                board={isReplaying && replayBoard ? replayBoard : game.boardState}
                size={game.boardSize}
                heldStone={isReplaying ? null : heldStone}
                lastMove={isReplaying ? replayLastMove : (game.lastMoveX !== null && game.lastMoveY !== null
                  ? { x: game.lastMoveX, y: game.lastMoveY }
                  : null)}
                onBoardClick={isReplaying ? () => {} : handleBoardClick}
                topButtons={topButtons}
                boardColor="#3D3D3D"
                starPointColor={camoTan}
                blackStoneFlag="russia"
                whiteStoneFlag="ukraine"
                hideLastMoveMarker
                hideHoverRing
                explosionPositions={isReplaying ? (replayExplosion ? [replayExplosion] : []) : (explosionPos ? [explosionPos] : [])}
                droneAnimation={isReplaying ? replayDrone : droneAnimation}
              />
              {statsOverlay}
              <div className="absolute top-1/2 -translate-y-1/2" style={{ right: 'calc(100% + 20px)' }}>
                <StonePot
                  color={1}
                  potCount={game.whitePotCount}
                  captured={game.whiteCaptured}
                  onBoard={game.whiteOnBoard}
                  isHoldingStone={heldStone !== null}
                  heldStoneColor={heldStone?.color ?? null}
                  onClick={() => handlePotClick(1)}
                  outerColor="#005BBB"
                  isCurrentTurn={game.currentTurn === 1}
                  turnFlashColor="#005BBB"
                  stoneFlag="ukraine"
                />
              </div>
              <div className="absolute top-1/2 -translate-y-1/2" style={{ left: 'calc(100% + 20px)' }}>
                <StonePot
                  color={0}
                  potCount={game.blackPotCount}
                  captured={game.blackCaptured}
                  onBoard={game.blackOnBoard}
                  isHoldingStone={heldStone !== null}
                  heldStoneColor={heldStone?.color ?? null}
                  onClick={() => handlePotClick(0)}
                  outerColor="#D52B1E"
                  isCurrentTurn={game.currentTurn === 0}
                  turnFlashColor="#D52B1E"
                  stoneFlag="russia"
                />
              </div>
              </div>
            </div>
          </div>
        ) : isTablet ? (
          <div className="flex flex-col items-center">
            <div className="flex justify-center mb-4">
              <StonePot
                color={1}
                potCount={game.whitePotCount}
                captured={game.whiteCaptured}
                onBoard={game.whiteOnBoard}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                rotated={true}
                onClick={() => handlePotClick(1)}
                innerColor={camoOlive}
                isCurrentTurn={game.currentTurn === 1}
                stoneFlag="ukraine"
              />
            </div>
            <div className="relative">
              <GoBoard
                board={isReplaying && replayBoard ? replayBoard : game.boardState}
                size={game.boardSize}
                heldStone={isReplaying ? null : heldStone}
                lastMove={isReplaying ? replayLastMove : (game.lastMoveX !== null && game.lastMoveY !== null
                  ? { x: game.lastMoveX, y: game.lastMoveY }
                  : null)}
                onBoardClick={isReplaying ? () => {} : handleBoardClick}
                topButtons={
                  <div className="flex items-center justify-between w-full rotate-180">
                    <button onClick={handleShare} className="font-bold text-sm uppercase hover:opacity-70 transition-opacity" style={{ color: camoTan }}>
                      {copied ? 'COPIED!' : 'SHARE'}
                    </button>
                    <button onClick={clearBoard} className="font-bold text-sm uppercase hover:opacity-70 transition-opacity" style={{ color: camoTan }}>
                      NUKE
                    </button>
                    <button onClick={startReplay} disabled={isReplaying} className="font-bold text-sm uppercase hover:opacity-70 transition-opacity disabled:opacity-50" style={{ color: camoTan }}>
                      {isReplaying ? 'REPLAYING' : 'REPLAY'}
                    </button>
                    <button onClick={() => router.push('/bang')} className="font-bold text-sm uppercase hover:opacity-70 transition-opacity" style={{ color: camoTan }}>
                      Base
                    </button>
                  </div>
                }
                bottomButtons={topButtons}
                boardColor="#3D3D3D"
                starPointColor={camoTan}
                blackStoneFlag="russia"
                whiteStoneFlag="ukraine"
                hideLastMoveMarker
                hideHoverRing
                explosionPositions={isReplaying ? (replayExplosion ? [replayExplosion] : []) : (explosionPos ? [explosionPos] : [])}
                droneAnimation={isReplaying ? replayDrone : droneAnimation}
              />
              {statsOverlay}
            </div>
            <div className="flex justify-center mt-4">
              <StonePot
                color={0}
                potCount={game.blackPotCount}
                captured={game.blackCaptured}
                onBoard={game.blackOnBoard}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                onClick={() => handlePotClick(0)}
                innerColor={camoOlive}
                isCurrentTurn={game.currentTurn === 0}
                stoneFlag="russia"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative">
              <GoBoard
                board={isReplaying && replayBoard ? replayBoard : game.boardState}
                size={game.boardSize}
                heldStone={isReplaying ? null : heldStone}
                lastMove={isReplaying ? replayLastMove : (game.lastMoveX !== null && game.lastMoveY !== null
                  ? { x: game.lastMoveX, y: game.lastMoveY }
                  : null)}
                onBoardClick={isReplaying ? () => {} : handleBoardClick}
                topButtons={topButtons}
                boardColor="#3D3D3D"
                starPointColor={camoTan}
                blackStoneFlag="russia"
                whiteStoneFlag="ukraine"
                hideLastMoveMarker
                hideHoverRing
                explosionPositions={isReplaying ? (replayExplosion ? [replayExplosion] : []) : (explosionPos ? [explosionPos] : [])}
                droneAnimation={isReplaying ? replayDrone : droneAnimation}
              />
              {statsOverlay}
            </div>
            <div className="flex gap-4 mt-4">
              <StonePot
                color={1}
                potCount={game.whitePotCount}
                captured={game.whiteCaptured}
                onBoard={game.whiteOnBoard}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                small={true}
                onClick={() => handlePotClick(1)}
                innerColor={camoOlive}
                isCurrentTurn={game.currentTurn === 1}
                stoneFlag="ukraine"
              />
              <StonePot
                color={0}
                potCount={game.blackPotCount}
                captured={game.blackCaptured}
                onBoard={game.blackOnBoard}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                small={true}
                onClick={() => handlePotClick(0)}
                innerColor={camoOlive}
                isCurrentTurn={game.currentTurn === 0}
                stoneFlag="russia"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
