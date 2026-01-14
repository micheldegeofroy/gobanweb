'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CrazyGoBoard, { CrazyHeldStone } from '@/components/CrazyGoBoard';
import CrazyStonePot from '@/components/CrazyStonePot';
import { useDeviceType } from '@/hooks/useDeviceType';

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
  blackReturned: number;
  whiteReturned: number;
  brownReturned: number;
  greyReturned: number;
  lastMoveX: number | null;
  lastMoveY: number | null;
  koPointX: number | null;
  koPointY: number | null;
  connectedUsers: number;
  publicKey: string;
  updatedAt: string;
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
  const isDesktop = deviceType === 'desktop';

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

  useEffect(() => {
    if (!game || !privateKey || !gameId) return;
    const interval = setInterval(() => fetchGame(gameId), 1000);
    return () => clearInterval(interval);
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

      const data = await res.json();
      setGame(prev => prev ? {
        ...prev,
        boardState: data.boardState,
        blackPotCount: data.blackPotCount,
        whitePotCount: data.whitePotCount,
        brownPotCount: data.brownPotCount,
        greyPotCount: data.greyPotCount,
        blackReturned: data.blackReturned,
        whiteReturned: data.whiteReturned,
        brownReturned: data.brownReturned,
        greyReturned: data.greyReturned,
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
      }
    } else {
      const potCounts = {
        0: (game?.blackPotCount ?? 0) + (game?.blackReturned ?? 0),
        1: (game?.whitePotCount ?? 0) + (game?.whiteReturned ?? 0),
        2: (game?.brownPotCount ?? 0) + (game?.brownReturned ?? 0),
        3: (game?.greyPotCount ?? 0) + (game?.greyReturned ?? 0),
      };
      if (potCounts[color] > 0) {
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
          const testBoard = game.boardState.map(row => [...row]) as CrazyBoard;
          testBoard[heldStone.fromBoard.y][heldStone.fromBoard.x] = null;
          if (wouldBeSuicide(testBoard, pos.x, pos.y, heldStone.color)) return;
          if (game.koPointX !== null && game.koPointY !== null && pos.x === game.koPointX && pos.y === game.koPointY) return;
          performAction('move', {
            fromX: heldStone.fromBoard.x,
            fromY: heldStone.fromBoard.y,
            toX: pos.x,
            toY: pos.y,
          }).then(success => { if (success) setHeldStone(null); });
        } else {
          if (wouldBeSuicide(game.boardState, pos.x, pos.y, heldStone.color)) return;
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
    const shareUrl = `${window.location.origin}/crazy/${gameId}?key=${encodeURIComponent(privateKey)}`;
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
    localStorage.setItem(`crazy_${gameId}_privateKey`, key);
    setPrivateKey(key);
    await fetchGame(gameId);
    setShowKeyModal(false);
  };

  if (showKeyModal && !privateKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-zinc-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-6">Access Denied</h2>
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste Board URL to Access"
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleKeySubmit()}
          />
          <div className="flex gap-3">
            <button onClick={handleKeySubmit} className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-zinc-900 flex items-center justify-center">
        <div className="text-xl text-zinc-600 dark:text-zinc-400">Loading board...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-zinc-900 flex items-center justify-center">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button onClick={() => router.push('/crazy')} className="px-6 py-3 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors">
            Home
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-zinc-900">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button onClick={() => router.push('/crazy')} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm">
            Home
          </button>
          <span className="text-purple-600 font-bold">Crazy Go</span>
          <button onClick={handleShare} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm">
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Game Board with 4 Stone Pots */}
        {isDesktop ? (
          /* Desktop: 2 pots on each side */
          <div className="relative flex items-center justify-center">
            <div className="relative">
              <CrazyGoBoard
                board={game.boardState}
                size={game.boardSize}
                heldStone={heldStone}
                lastMove={game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null}
                onBoardClick={handleBoardClick}
              />
              {/* Left pots (White & Brown) */}
              <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-4" style={{ right: 'calc(100% + 20px)' }}>
                <CrazyStonePot color={1} count={game.whitePotCount} returned={game.whiteReturned} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} onClick={() => handlePotClick(1)} />
                <CrazyStonePot color={2} count={game.brownPotCount} returned={game.brownReturned} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} onClick={() => handlePotClick(2)} />
              </div>
              {/* Right pots (Black & Grey) */}
              <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-4" style={{ left: 'calc(100% + 20px)' }}>
                <CrazyStonePot color={0} count={game.blackPotCount} returned={game.blackReturned} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} onClick={() => handlePotClick(0)} />
                <CrazyStonePot color={3} count={game.greyPotCount} returned={game.greyReturned} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} onClick={() => handlePotClick(3)} />
              </div>
            </div>
          </div>
        ) : (
          /* Mobile/Tablet: All 4 pots at bottom */
          <div className="flex flex-col items-center">
            <CrazyGoBoard
              board={game.boardState}
              size={game.boardSize}
              heldStone={heldStone}
              lastMove={game.lastMoveX !== null && game.lastMoveY !== null ? { x: game.lastMoveX, y: game.lastMoveY } : null}
              onBoardClick={handleBoardClick}
            />
            <div className="flex gap-3 mt-4">
              <CrazyStonePot color={0} count={game.blackPotCount} returned={game.blackReturned} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} small={true} onClick={() => handlePotClick(0)} />
              <CrazyStonePot color={1} count={game.whitePotCount} returned={game.whiteReturned} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} small={true} onClick={() => handlePotClick(1)} />
              <CrazyStonePot color={2} count={game.brownPotCount} returned={game.brownReturned} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} small={true} onClick={() => handlePotClick(2)} />
              <CrazyStonePot color={3} count={game.greyPotCount} returned={game.greyReturned} isHoldingStone={heldStone !== null} heldStoneColor={heldStone?.color ?? null} small={true} onClick={() => handlePotClick(3)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
