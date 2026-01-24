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
  createdAt: string;
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
  lastMoveX: number | null;
  lastMoveY: number | null;
  koPointX: number | null;
  koPointY: number | null;
  connectedUsers: number;
  publicKey: string;
  updatedAt: string;
}

export default function DomGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceType = useDeviceType();
  const haptic = useHapticFeedback();
  const isDesktop = deviceType === 'desktop';
  const isTablet = deviceType === 'tablet';
  const isMobile = deviceType === 'mobile';

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
  const [currentTurn, setCurrentTurn] = useState<0 | 1>(0); // Local turn tracking
  const hasInitialized = useRef(false);

  // Replay state
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayActions, setReplayActions] = useState<GameAction[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayBoard, setReplayBoard] = useState<Board | null>(null);
  const [replayLastMove, setReplayLastMove] = useState<Position | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTime = useRef<number>(0);
  const lastOptimisticUpdate = useRef<number>(0);

  // Fetch game data
  const fetchGame = useCallback(async (gId: string, forceApply: boolean = false) => {
    try {
      const res = await fetch(`/api/games/${gId}`);
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
        const OPTIMISTIC_PROTECTION_MS = 4000;
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
      localStorage.setItem(`game_${gameId}_privateKey`, key);
      setPrivateKey(key);
      await fetchGame(gameId, true);
      setShowKeyModal(false);
      setIsLoading(false);
    };

    if (urlKey) {
      initializeGame(urlKey);
    } else {
      const storedKey = localStorage.getItem(`game_${gameId}_privateKey`);
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

    try {
      const res = await fetch(`/api/games/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privateKey,
          actionType,
          ...options,
        }),
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
          const testBoard = game.boardState.map(row => [...row]);
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
          const newBoard = game.boardState.map(row => [...row]);
          newBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          newBoard[pos.y][pos.x] = heldStone.color;
          const { newBoard: boardAfterCaptures, blackCaptured, whiteCaptured } = detectAndRemoveCaptures(newBoard);
          if (blackCaptured > 0 || whiteCaptured > 0) {
            haptic.capture();
          } else {
            haptic.stonePlaced();
          }
          lastOptimisticUpdate.current = Date.now();
          setGame(prev => prev ? {
            ...prev,
            boardState: boardAfterCaptures,
            lastMoveX: pos.x,
            lastMoveY: pos.y,
            blackCaptured: prev.blackCaptured + whiteCaptured,
            whiteCaptured: prev.whiteCaptured + blackCaptured,
            blackOnBoard: prev.blackOnBoard - blackCaptured,
            whiteOnBoard: prev.whiteOnBoard - whiteCaptured,
          } : null);
          setHeldStone(null);
          performAction('move', {
            fromX: heldStone.fromBoard.x,
            fromY: heldStone.fromBoard.y,
            toX: pos.x,
            toY: pos.y,
          });
        } else {
          if (wouldBeSuicide(game.boardState, pos.x, pos.y, heldStone.color)) {
            haptic.invalidMove();
            return;
          }
          if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) {
            haptic.invalidMove();
            return;
          }
          lastActionTime.current = Date.now();
          const newBoard = game.boardState.map(row => [...row]);
          newBoard[pos.y][pos.x] = heldStone.color;
          const { newBoard: boardAfterCaptures, blackCaptured, whiteCaptured } = detectAndRemoveCaptures(newBoard);
          if (blackCaptured > 0 || whiteCaptured > 0) {
            haptic.capture();
          } else {
            haptic.stonePlaced();
          }
          lastOptimisticUpdate.current = Date.now();
          setGame(prev => prev ? {
            ...prev,
            boardState: boardAfterCaptures,
            lastMoveX: pos.x,
            lastMoveY: pos.y,
            blackPotCount: prev.blackPotCount - (heldStone.color === 0 ? 1 : 0),
            whitePotCount: prev.whitePotCount - (heldStone.color === 1 ? 1 : 0),
            blackOnBoard: prev.blackOnBoard + (heldStone.color === 0 ? 1 : 0) - blackCaptured,
            whiteOnBoard: prev.whiteOnBoard + (heldStone.color === 1 ? 1 : 0) - whiteCaptured,
            blackCaptured: prev.blackCaptured + whiteCaptured,
            whiteCaptured: prev.whiteCaptured + blackCaptured,
          } : null);
          setCurrentTurn(prev => prev === 0 ? 1 : 0);
          setHeldStone(null);
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
      } else {
        // Direct placement - place stone of current turn's color without picking up first
        const turnColor = currentTurn;
        const potCount = turnColor === 0 ? game.blackPotCount : game.whitePotCount;
        if (potCount <= 0) return;

        if (wouldBeSuicide(game.boardState, pos.x, pos.y, turnColor)) {
          haptic.invalidMove();
          return;
        }
        if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) {
          haptic.invalidMove();
          return;
        }

        lastActionTime.current = Date.now();

        // Optimistic update - place stone and detect captures
        const newBoard = game.boardState.map(row => [...row]);
        newBoard[pos.y][pos.x] = turnColor;
        const { newBoard: boardAfterCaptures, blackCaptured, whiteCaptured } = detectAndRemoveCaptures(newBoard);

        if (blackCaptured > 0 || whiteCaptured > 0) {
          haptic.capture();
        } else {
          haptic.stonePlaced();
        }

        lastOptimisticUpdate.current = Date.now();
        setGame(prev => prev ? {
          ...prev,
          boardState: boardAfterCaptures,
          lastMoveX: pos.x,
          lastMoveY: pos.y,
          blackPotCount: prev.blackPotCount - (turnColor === 0 ? 1 : 0),
          whitePotCount: prev.whitePotCount - (turnColor === 1 ? 1 : 0),
          blackOnBoard: prev.blackOnBoard + (turnColor === 0 ? 1 : 0) - blackCaptured,
          whiteOnBoard: prev.whiteOnBoard + (turnColor === 1 ? 1 : 0) - whiteCaptured,
          blackCaptured: prev.blackCaptured + whiteCaptured,
          whiteCaptured: prev.whiteCaptured + blackCaptured,
        } : null);
        setCurrentTurn(prev => prev === 0 ? 1 : 0);

        performAction('place', {
          stoneColor: turnColor,
          toX: pos.x,
          toY: pos.y,
        });
      }
    }
  };

  // Share - copy URL with key to clipboard
  const handleShare = async () => {
    if (!privateKey || !gameId) return;
    const shareUrl = `${window.location.origin}/dom/${gameId}?key=${encodeURIComponent(privateKey)}`;

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

    localStorage.setItem(`game_${gameId}_privateKey`, key);
    setPrivateKey(key);
    await fetchGame(gameId, true);
    setShowKeyModal(false);
  };

  // Replay functions
  const computeBoardAtStep = useCallback((actions: GameAction[], step: number, boardSize: number): { board: Board; lastMove: Position | null } => {
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
          }
          break;
      }

      if (action.actionType === 'place' || action.actionType === 'move') {
        const captureResult = detectAndRemoveCaptures(board);
        board = captureResult.newBoard;
      }
    }

    return { board, lastMove };
  }, []);

  const startReplay = async () => {
    if (!gameId) return;

    try {
      const res = await fetch(`/api/games/${gameId}/history`);
      if (!res.ok) {
        setError('Failed to load game history');
        return;
      }

      const data = await res.json();
      setReplayActions(data.actions);
      setReplayIndex(0);
      setReplayBoard(createEmptyBoard(data.boardSize));
      setReplayLastMove(null);
      setIsReplaying(true);
      setIsAutoPlaying(true);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load game history');
    }
  };

  const exitReplay = () => {
    setIsReplaying(false);
    setReplayActions([]);
    setReplayIndex(0);
    setReplayBoard(null);
    setReplayLastMove(null);
    setIsAutoPlaying(false);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const clearBoard = async () => {
    if (!privateKey || !gameId) return;
    try {
      const res = await fetch(`/api/games/${gameId}/clear`, {
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
        blackCaptured: data.blackCaptured,
        whiteCaptured: data.whiteCaptured,
        blackOnBoard: data.blackOnBoard,
        whiteOnBoard: data.whiteOnBoard,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
      } : null);
      setCurrentTurn(0); // Reset to black's turn
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
      const res = await fetch(`/api/games/${gameId}/undo`, {
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
        blackCaptured: data.blackCaptured,
        whiteCaptured: data.whiteCaptured,
        blackOnBoard: data.blackOnBoard,
        whiteOnBoard: data.whiteOnBoard,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
      } : null);
      setCurrentTurn(prev => prev === 0 ? 1 : 0); // Toggle turn back
      setHeldStone(null);
    } catch (err) {
      console.error('Error undoing move:', err);
      setError('Failed to undo');
      setTimeout(() => setError(null), 3000);
    }
  };

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
            return prev;
          }
          const newIndex = prev + 1;
          const { board, lastMove } = computeBoardAtStep(replayActions, newIndex, game.boardSize);
          setReplayBoard(board);
          setReplayLastMove(lastMove);
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
  }, [isAutoPlaying, isReplaying, replayActions, game, computeBoardAtStep]);

  // Airbnb-style colors
  const airbnbRed = '#FF5A5F';
  const airbnbDark = '#484848';
  const airbnbGray = '#767676';

  // Show key input modal if no key - Airbnb style
  if (showKeyModal && !privateKey) {
    return (
      <div className={`flex items-center justify-center p-4 ${isDesktop ? 'min-h-screen' : 'h-dvh'}`} style={{ backgroundColor: airbnbRed }}>
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border border-gray-200">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: airbnbDark }}>
            Join this board
          </h2>

          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste Board URL to Access"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 mb-4"
            style={{
              color: airbnbDark,
              // @ts-ignore
              '--tw-ring-color': airbnbRed
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()}
          />

          <div className="flex gap-3">
            <button
              onClick={handleKeySubmit}
              className="flex-1 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: airbnbRed }}
            >
              Join Board
            </button>
            <button
              onClick={() => router.push('/dom')}
              className="flex-1 py-3 rounded-lg font-semibold border-2 transition-colors hover:bg-gray-50"
              style={{ borderColor: airbnbDark, color: airbnbDark }}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${isDesktop ? 'min-h-screen' : 'h-dvh'}`} style={{ backgroundColor: airbnbRed }}>
        <div className="text-xl text-white font-semibold">Loading board...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className={`flex items-center justify-center ${isDesktop ? 'min-h-screen' : 'h-dvh'}`} style={{ backgroundColor: airbnbRed }}>
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-xl mb-4" style={{ color: airbnbDark }}>{error}</div>
          <button
            onClick={() => router.push('/dom')}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: airbnbDark }}
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  // Top buttons for GoBoard perimeter - Airbnb style
  const topButtons = (
    <>
      <button
        onClick={() => router.push('/dom')}
        className="font-semibold text-sm uppercase hover:opacity-70 transition-opacity"
        style={{ color: airbnbRed }}
      >
        Home
      </button>
      <button
        onClick={startReplay}
        disabled={isReplaying}
        className="font-semibold text-sm uppercase hover:opacity-70 transition-opacity disabled:opacity-50"
        style={{ color: airbnbRed }}
      >
        {isReplaying ? 'REPLAYING' : 'REPLAY'}
      </button>
      <button
        onClick={undoMove}
        className="font-semibold text-sm uppercase hover:opacity-70 transition-opacity"
        style={{ color: airbnbRed }}
      >
        UNDO
      </button>
      <button
        onClick={handleShare}
        className="font-semibold text-sm uppercase hover:opacity-70 transition-opacity"
        style={{ color: airbnbRed }}
      >
        {copied ? 'COPIED!' : 'SHARE'}
      </button>
    </>
  );

  return (
    <div className={`${isDesktop ? 'min-h-screen' : 'h-dvh flex flex-col'}`} style={{ backgroundColor: airbnbRed }}>
      <div className={`container mx-auto px-2 sm:px-4 ${isDesktop ? 'pt-12 sm:pt-16 pb-4 sm:pb-8' : 'flex-1 flex flex-col justify-center'} ${isTablet ? 'pb-[72px]' : ''} ${isMobile ? 'pb-4' : ''}`}>

        {/* Error message - Airbnb style */}
        {error && (
          <div className="bg-white/90 px-4 py-3 rounded-lg mb-6 text-center" style={{ color: airbnbDark }}>
            {error}
          </div>
        )}

        {/* Game Board with Stone Pots */}
        {isDesktop ? (
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
                boardColor="#FFFFFF"
                whiteStoneGlow="#FF5A5F"
                blackStoneColor="#FF5A5F"
                blackStoneGlow="#FFFFFF"
                starPointColor="#FF5A5F"
                whiteStoneMarker="#FF5A5F"
                hideCoordinates={true}
              />
              <div className="absolute top-1/2 -translate-y-1/2" style={{ right: 'calc(100% + 20px)' }}>
                <StonePot
                  color={1}
                  potCount={game.whitePotCount}
                  captured={game.whiteCaptured}
                  onBoard={game.whiteOnBoard}
                  isHoldingStone={heldStone !== null}
                  heldStoneColor={heldStone?.color ?? null}
                  onClick={() => handlePotClick(1)}
                  innerColor="#FFFFFF"
                  stoneGlowColor="#FF5A5F"
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
                  innerColor="#FFFFFF"
                  stonePreviewColor="#FF5A5F"
                />
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
                innerColor="#FFFFFF"
                stoneGlowColor="#FF5A5F"
              />
            </div>
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
                  <button onClick={handleShare} className="font-semibold text-sm uppercase hover:opacity-70 transition-opacity" style={{ color: airbnbRed }}>
                    {copied ? 'COPIED!' : 'SHARE'}
                  </button>
                  <button onClick={undoMove} className="font-semibold text-sm uppercase hover:opacity-70 transition-opacity" style={{ color: airbnbRed }}>
                    UNDO
                  </button>
                  <button onClick={startReplay} disabled={isReplaying} className="font-semibold text-sm uppercase hover:opacity-70 transition-opacity disabled:opacity-50" style={{ color: airbnbRed }}>
                    {isReplaying ? 'REPLAYING' : 'REPLAY'}
                  </button>
                  <button onClick={() => router.push('/dom')} className="font-semibold text-sm uppercase hover:opacity-70 transition-opacity" style={{ color: airbnbRed }}>
                    Home
                  </button>
                </div>
              }
              bottomButtons={topButtons}
              boardColor="#FFFFFF"
                whiteStoneGlow="#FF5A5F"
                blackStoneColor="#FF5A5F"
                blackStoneGlow="#FFFFFF"
                starPointColor="#FF5A5F"
                whiteStoneMarker="#FF5A5F"
                hideCoordinates={true}
            />
            <div className="flex justify-center mt-4">
              <StonePot
                color={0}
                potCount={game.blackPotCount}
                captured={game.blackCaptured}
                onBoard={game.blackOnBoard}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                onClick={() => handlePotClick(0)}
                innerColor="#FF5A5F"
                stonePreviewColor="#FF5A5F"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <GoBoard
              board={isReplaying && replayBoard ? replayBoard : game.boardState}
              size={game.boardSize}
              heldStone={isReplaying ? null : heldStone}
              lastMove={isReplaying ? replayLastMove : (game.lastMoveX !== null && game.lastMoveY !== null
                ? { x: game.lastMoveX, y: game.lastMoveY }
                : null)}
              onBoardClick={isReplaying ? () => {} : handleBoardClick}
              topButtons={topButtons}
              boardColor="#FFFFFF"
                whiteStoneGlow="#FF5A5F"
                blackStoneColor="#FF5A5F"
                blackStoneGlow="#FFFFFF"
                starPointColor="#FF5A5F"
                whiteStoneMarker="#FF5A5F"
                hideCoordinates={true}
            />
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
                innerColor="#FFFFFF"
                stoneGlowColor="#FF5A5F"
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
                innerColor="#FFFFFF"
                stonePreviewColor="#FF5A5F"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
