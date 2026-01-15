'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WildeGoBoard, { WildeHeldStone } from '@/components/WildeGoBoard';
import WildeStonePot from '@/components/WildeStonePot';
import { useDeviceType } from '@/hooks/useDeviceType';
import { StonePot } from '@/lib/db/schema';
import { createEmptyBoard } from '@/lib/wilde/colors';

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
  const isDesktop = deviceType === 'desktop';
  const isTablet = deviceType === 'tablet';

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

  useEffect(() => {
    if (!game || !privateKey || !gameId) return;
    const interval = setInterval(() => fetchGame(gameId), 1000);
    return () => clearInterval(interval);
  }, [game, privateKey, gameId, fetchGame]);

  const performAction = async (
    actionType: 'place' | 'remove' | 'move',
    options: {
      stoneColor?: number;
      fromX?: number;
      fromY?: number;
      toX?: number;
      toY?: number;
    }
  ) => {
    if (!privateKey || !game) return;

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

      return true;
    } catch (err) {
      console.error('Error performing action:', err);
      setError('Action failed');
      setTimeout(() => setError(null), 3000);
      return false;
    }
  };

  const handlePotClick = (color: number) => {
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
      }
    } else {
      const pot = game.stonePots[color];
      if (pot && pot.potCount + pot.returned > 0) {
        setHeldStone({ color });
      }
    }
  };

  const handleBoardClick = (pos: Position) => {
    if (!game) return;
    const stoneAtPos = game.boardState[pos.y][pos.x];

    if (heldStone) {
      if (stoneAtPos === null) {
        if (heldStone.fromBoard) {
          const testBoard = game.boardState.map(row => [...row]) as WildeBoard;
          testBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          if (wouldBeSuicide(testBoard, pos.x, pos.y, heldStone.color, game.boardWidth, game.boardHeight)) return;
          if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) return;
          performAction('move', {
            fromX: heldStone.fromBoard.x,
            fromY: heldStone.fromBoard.y,
            toX: pos.x,
            toY: pos.y,
          }).then(success => { if (success) setHeldStone(null); });
        } else {
          if (wouldBeSuicide(game.boardState, pos.x, pos.y, heldStone.color, game.boardWidth, game.boardHeight)) return;
          if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) return;
          performAction('place', {
            stoneColor: heldStone.color,
            toX: pos.x,
            toY: pos.y,
          }).then(success => { if (success) setHeldStone(null); });
        }
      }
    } else {
      if (stoneAtPos !== null) {
        setHeldStone({ color: stoneAtPos, fromBoard: pos });
      }
    }
  };

  const handleShare = () => {
    if (!privateKey || !gameId) return;
    const shareUrl = `${window.location.origin}/wilde/${gameId}?key=${encodeURIComponent(privateKey)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      setIsPlaying(false);
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

  useEffect(() => {
    if (isPlaying && replayIndex < replayActions.length) {
      replayIntervalRef.current = setTimeout(() => {
        stepForward();
      }, 500);
    } else if (isPlaying && replayIndex >= replayActions.length) {
      setIsPlaying(false);
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
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-purple-800 dark:text-purple-100 mb-6">Access Denied</h2>
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste Board URL to Access"
            className="w-full px-4 py-3 rounded-lg border border-purple-200 dark:border-purple-600 bg-white dark:bg-zinc-700 text-purple-800 dark:text-purple-100 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()}
          />
          <div className="flex gap-3">
            <button onClick={handleKeySubmit} className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition-colors">
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
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-xl text-purple-600 dark:text-purple-300">Loading board...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900 flex items-center justify-center">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button onClick={() => router.push('/wilde')} className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold">
            Home
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  // Top buttons for board perimeter
  const topButtons = isReplayMode ? (
    <>
      <button onClick={() => router.push('/wilde')} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        Home
      </button>
      <button onClick={exitReplay} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        Exit
      </button>
      <button onClick={handleShare} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        {copied ? 'COPIED!' : 'SHARE'}
      </button>
    </>
  ) : (
    <>
      <button onClick={() => router.push('/wilde')} className="text-purple-700 font-bold text-sm uppercase hover:opacity-70 transition-opacity">
        Home
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
    </>
  );

  // Render pots based on player count
  const renderPots = (small: boolean = false) => {
    const pots = [];
    for (let i = 0; i < game.playerCount; i++) {
      const pot = game.stonePots[i] || { potCount: 0, returned: 0 };
      pots.push(
        <WildeStonePot
          key={i}
          color={i}
          count={pot.potCount}
          returned={pot.returned}
          isHoldingStone={heldStone !== null}
          heldStoneColor={heldStone?.color ?? null}
          isCurrentTurn={game.currentTurn === i}
          small={small}
          onClick={() => handlePotClick(i)}
        />
      );
    }
    return pots;
  };

  // Split pots for desktop layout
  const leftPots = renderPots().slice(0, Math.ceil(game.playerCount / 2));
  const rightPots = renderPots().slice(Math.ceil(game.playerCount / 2));

  return (
    <div className={`min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900 ${isTablet ? 'flex flex-col' : ''}`}>
      <div className={`container mx-auto px-2 sm:px-4 ${isTablet ? 'flex-1 flex flex-col justify-center py-4' : 'pt-12 sm:pt-16 pb-4 sm:pb-8'}`}>
        {/* Replay Controls */}
        {isReplayMode && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={stepBackward} disabled={replayIndex === 0} className="px-3 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
              &lt; Back
            </button>
            <button onClick={togglePlay} className="px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-400 transition-colors text-sm min-w-[80px]">
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={stepForward} disabled={replayIndex >= replayActions.length} className="px-3 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
              Next &gt;
            </button>
            <span className="text-purple-600 dark:text-purple-300 text-sm">
              {replayIndex} / {replayActions.length}
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Game Board with Stone Pots */}
        {isReplayMode && replayBoard ? (
          <div className="flex justify-center">
            <WildeGoBoard
              board={replayBoard}
              width={replayWidth}
              height={replayHeight}
              playerCount={replayPlayerCount}
              heldStone={null}
              lastMove={null}
              onBoardClick={() => {}}
              topButtons={topButtons}
            />
          </div>
        ) : isDesktop ? (
          <div className="relative flex items-center justify-center">
            <div className="relative">
              <WildeGoBoard
                board={game.boardState}
                width={game.boardWidth}
                height={game.boardHeight}
                playerCount={game.playerCount}
                heldStone={heldStone}
                lastMove={game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null}
                onBoardClick={handleBoardClick}
                topButtons={topButtons}
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
                board={game.boardState}
                width={game.boardWidth}
                height={game.boardHeight}
                playerCount={game.playerCount}
                heldStone={heldStone}
                lastMove={game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null}
                onBoardClick={handleBoardClick}
                topButtons={topButtons}
              />
            </div>
            {/* All pots at bottom in rows */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {renderPots(false)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div className="flex justify-center w-full">
              <WildeGoBoard
                board={game.boardState}
                width={game.boardWidth}
                height={game.boardHeight}
                playerCount={game.playerCount}
                heldStone={heldStone}
                lastMove={game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null}
                onBoardClick={handleBoardClick}
                topButtons={topButtons}
              />
            </div>
            {/* All pots at bottom in rows */}
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-[400px]">
              {renderPots(true)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
