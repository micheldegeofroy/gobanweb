'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GoBoard, { HeldStone } from '@/components/GoBoard';
import StonePot from '@/components/StonePot';
import { useDeviceType } from '@/hooks/useDeviceType';
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
  blackReturned: number;
  whiteReturned: number;
  lastMoveX: number | null;
  lastMoveY: number | null;
  koPointX: number | null;
  koPointY: number | null;
  connectedUsers: number;
  publicKey: string;
  updatedAt: string;
}

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceType = useDeviceType();
  const isDesktop = deviceType === 'desktop';
  const isTablet = deviceType === 'tablet';

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
  const hasInitialized = useRef(false);

  // Replay state
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayActions, setReplayActions] = useState<GameAction[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayBoard, setReplayBoard] = useState<Board | null>(null);
  const [replayLastMove, setReplayLastMove] = useState<Position | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch game data
  const fetchGame = useCallback(async (gId: string) => {
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
    // Wait until we've checked the URL for a key before proceeding
    if (!gameId || !hasCheckedUrl || hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeGame = async (key: string) => {
      localStorage.setItem(`game_${gameId}_privateKey`, key);
      setPrivateKey(key);
      await fetchGame(gameId);
      setShowKeyModal(false);
      setIsLoading(false);
    };

    // Priority: URL key > localStorage key > show modal
    if (urlKey) {
      // Key in URL - use it and store it
      initializeGame(urlKey);
    } else {
      // Check localStorage
      const storedKey = localStorage.getItem(`game_${gameId}_privateKey`);
      if (storedKey) {
        initializeGame(storedKey);
      } else {
        // No key found - show modal to ask for key
        setShowKeyModal(true);
        setIsLoading(false);
      }
    }
  }, [gameId, hasCheckedUrl, urlKey, fetchGame]);

  // Poll for updates
  useEffect(() => {
    if (!game || !privateKey || !gameId) return;

    const interval = setInterval(() => fetchGame(gameId), 1000);
    return () => clearInterval(interval);
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

      const data = await res.json();
      // Update local state immediately for responsiveness
      setGame(prev => prev ? {
        ...prev,
        boardState: data.boardState,
        blackPotCount: data.blackPotCount,
        whitePotCount: data.whitePotCount,
        blackReturned: data.blackReturned,
        whiteReturned: data.whiteReturned,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
      } : null);

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
      // If holding a stone of this color, return it to pot
      if (heldStone.color === color) {
        if (heldStone.fromBoard) {
          // Stone was from board, remove it
          performAction('remove', {
            fromX: heldStone.fromBoard.x,
            fromY: heldStone.fromBoard.y,
          });
        }
        // If from pot, just drop it (no server action needed, it never left)
        setHeldStone(null);
      }
    } else {
      // Pick up a stone from the pot (check total: original + returned)
      const potCount = color === 0 ? game?.blackPotCount : game?.whitePotCount;
      const returned = color === 0 ? game?.blackReturned : game?.whiteReturned;
      const total = (potCount ?? 0) + (returned ?? 0);
      if (total > 0) {
        setHeldStone({ color });
      }
    }
  };

  // Handle clicking on the board
  const handleBoardClick = (pos: Position) => {
    if (!game) return;

    const stoneAtPos = game.boardState[pos.y][pos.x];

    if (heldStone) {
      // Holding a stone - try to place it
      if (stoneAtPos === null) {
        if (heldStone.fromBoard) {
          // Moving a stone on the board - simulate the board without the source stone for suicide check
          const testBoard = game.boardState.map(row => [...row]);
          testBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          if (wouldBeSuicide(testBoard, pos.x, pos.y, heldStone.color)) {
            // Suicide move - silently ignore
            return;
          }
          // Check Ko rule - cannot move to Ko point
          if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) {
            // Ko violation - silently ignore
            return;
          }
          performAction('move', {
            fromX: heldStone.fromBoard.x,
            fromY: heldStone.fromBoard.y,
            toX: pos.x,
            toY: pos.y,
          }).then(success => {
            if (success) setHeldStone(null);
          });
        } else {
          // Placing a new stone from pot - check for suicide first
          if (wouldBeSuicide(game.boardState, pos.x, pos.y, heldStone.color)) {
            // Suicide move - silently ignore
            return;
          }
          // Check Ko rule - cannot place on Ko point
          if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) {
            // Ko violation - silently ignore
            return;
          }
          performAction('place', {
            stoneColor: heldStone.color,
            toX: pos.x,
            toY: pos.y,
          }).then(success => {
            if (success) setHeldStone(null);
          });
        }
      }
      // If position is occupied, do nothing (can't stack stones)
    } else {
      // Not holding a stone - pick one up from board
      if (stoneAtPos !== null) {
        setHeldStone({
          color: stoneAtPos as 0 | 1,
          fromBoard: pos,
        });
      }
    }
  };

  // Share - copy URL with key to clipboard
  const handleShare = async () => {
    if (!privateKey || !gameId) return;
    const shareUrl = `${window.location.origin}/game/${gameId}?key=${encodeURIComponent(privateKey)}`;

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for iOS Safari
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
      // Fallback for iOS Safari
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

  // Submit key from modal - accepts URL or raw key
  const handleKeySubmit = async () => {
    if (!keyInput.trim() || !gameId) return;
    const input = keyInput.trim();

    let key = input;

    // Try to extract key from URL if input looks like a URL
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
    await fetchGame(gameId);
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

      // Apply captures after place or move
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
      setIsAutoPlaying(true); // Auto-start playing
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

  const replayStepForward = () => {
    if (replayIndex < replayActions.length && game) {
      const newIndex = replayIndex + 1;
      setReplayIndex(newIndex);
      const { board, lastMove } = computeBoardAtStep(replayActions, newIndex, game.boardSize);
      setReplayBoard(board);
      setReplayLastMove(lastMove);
    }
  };

  const replayStepBackward = () => {
    if (replayIndex > 0 && game) {
      const newIndex = replayIndex - 1;
      setReplayIndex(newIndex);
      const { board, lastMove } = computeBoardAtStep(replayActions, newIndex, game.boardSize);
      setReplayBoard(board);
      setReplayLastMove(lastMove);
    }
  };

  const replayGoToStart = () => {
    if (game) {
      setReplayIndex(0);
      setReplayBoard(createEmptyBoard(game.boardSize));
      setReplayLastMove(null);
    }
  };

  const replayGoToEnd = () => {
    if (game) {
      const newIndex = replayActions.length;
      setReplayIndex(newIndex);
      const { board, lastMove } = computeBoardAtStep(replayActions, newIndex, game.boardSize);
      setReplayBoard(board);
      setReplayLastMove(lastMove);
    }
  };

  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    } else {
      setIsAutoPlaying(true);
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
        blackReturned: data.blackReturned,
        whiteReturned: data.whiteReturned,
        lastMoveX: data.lastMoveX,
        lastMoveY: data.lastMoveY,
        koPointX: data.koPointX,
        koPointY: data.koPointY,
      } : null);
      setHeldStone(null);
    } catch (err) {
      console.error('Error clearing board:', err);
      setError('Failed to clear board');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Auto-play effect
  useEffect(() => {
    if (isAutoPlaying && isReplaying && game) {
      autoPlayRef.current = setInterval(() => {
        setReplayIndex(prev => {
          if (prev >= replayActions.length) {
            // Replay finished - exit replay mode
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

  // Show key input modal if no key
  if (showKeyModal && !privateKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-6">
            Access Denied
          </h2>

          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste Board URL to Access"
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()}
          />

          <div className="flex gap-3">
            <button
              onClick={handleKeySubmit}
              className="flex-1 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
            >
              Join Board
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-lg font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
        <div className="text-xl text-zinc-600 dark:text-zinc-400">Loading board...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  // Top buttons for GoBoard perimeter - black bold text
  const topButtons = (
    <>
      <button
        onClick={() => router.push('/')}
        className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity"
      >
        Home
      </button>
      <button
        onClick={startReplay}
        disabled={isReplaying}
        className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity disabled:opacity-50"
      >
        {isReplaying ? 'REPLAYING' : 'REPLAY'}
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
    <div className={`bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800 ${isTablet ? 'h-dvh flex flex-col' : 'min-h-screen'}`}>
      <div className={`container mx-auto px-2 sm:px-4 ${isTablet ? 'flex-1 flex flex-col justify-center pb-[72px]' : 'pt-12 sm:pt-16 pb-4 sm:pb-8'}`}>
        {/* Buttons are now rendered inside GoBoard perimeter */}

        {/* Error message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Game Board with Stone Pots */}
        {isDesktop ? (
          /* Desktop: Pots on left and right, 10px from board edge */
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
              />
              {/* Left pot (White) - positioned from left edge */}
              <div className="absolute top-1/2 -translate-y-1/2" style={{ right: 'calc(100% + 20px)' }}>
                <StonePot
                  color={1}
                  count={game.whitePotCount}
                  returned={game.whiteReturned}
                  isHoldingStone={heldStone !== null}
                  heldStoneColor={heldStone?.color ?? null}
                  onClick={() => handlePotClick(1)}
                />
              </div>
              {/* Right pot (Black) - positioned from right edge */}
              <div className="absolute top-1/2 -translate-y-1/2" style={{ left: 'calc(100% + 20px)' }}>
                <StonePot
                  color={0}
                  count={game.blackPotCount}
                  returned={game.blackReturned}
                  isHoldingStone={heldStone !== null}
                  heldStoneColor={heldStone?.color ?? null}
                  onClick={() => handlePotClick(0)}
                />
              </div>
            </div>
          </div>
        ) : isTablet ? (
          /* Tablet: Menus on board edges (top rotated, bottom normal), pots above/below */
          <div className="flex flex-col items-center">
            {/* Top pot centered */}
            <div className="flex justify-center mb-4">
              <StonePot
                color={1}
                count={game.whitePotCount}
                returned={game.whiteReturned}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                rotated={true}
                onClick={() => handlePotClick(1)}
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
                  <button onClick={handleShare} className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity">
                    {copied ? 'COPIED!' : 'SHARE'}
                  </button>
                  <button onClick={clearBoard} className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity">
                    CLEAR
                  </button>
                  <button onClick={startReplay} disabled={isReplaying} className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity disabled:opacity-50">
                    {isReplaying ? 'REPLAYING' : 'REPLAY'}
                  </button>
                  <button onClick={() => router.push('/')} className="text-black font-bold text-sm uppercase hover:opacity-70 transition-opacity">
                    Home
                  </button>
                </div>
              }
              bottomButtons={topButtons}
            />
            {/* Bottom pot centered */}
            <div className="flex justify-center mt-4">
              <StonePot
                color={0}
                count={game.blackPotCount}
                returned={game.blackReturned}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                onClick={() => handlePotClick(0)}
              />
            </div>
          </div>
        ) : (
          /* Mobile: Both pots at bottom, side by side */
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
            />
            {/* Both pots at bottom */}
            <div className="flex gap-4 mt-4">
              <StonePot
                color={1}
                count={game.whitePotCount}
                returned={game.whiteReturned}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                small={true}
                onClick={() => handlePotClick(1)}
              />
              <StonePot
                color={0}
                count={game.blackPotCount}
                returned={game.blackReturned}
                isHoldingStone={heldStone !== null}
                heldStoneColor={heldStone?.color ?? null}
                small={true}
                onClick={() => handlePotClick(0)}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
