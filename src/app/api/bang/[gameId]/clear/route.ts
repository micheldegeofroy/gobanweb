import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bangGames, bangActions } from '@/lib/db/schema';
import type { MinePosition } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import { createEmptyBoard } from '@/lib/game/logic';

// Standard stone counts based on board size
function getStoneCount(boardSize: number): { black: number; white: number } {
  if (boardSize === 9) return { black: 41, white: 40 };
  if (boardSize === 13) return { black: 85, white: 84 };
  return { black: 181, white: 180 };
}

// Generate new random mines
function generateMines(boardSize: number): MinePosition[] {
  const totalIntersections = boardSize * boardSize;
  const mineCount = Math.floor(totalIntersections * 0.1);
  const mines: MinePosition[] = [];
  const used = new Set<string>();

  while (mines.length < mineCount) {
    const x = Math.floor(Math.random() * boardSize);
    const y = Math.floor(Math.random() * boardSize);
    const key = `${x},${y}`;

    if (!used.has(key)) {
      used.add(key);
      mines.push({ x, y });
    }
  }

  return mines;
}

// POST /api/bang/[gameId]/clear - Reset the board with new mines
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { privateKey } = body;

    if (!privateKey) {
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    const game = await db
      .select()
      .from(bangGames)
      .where(eq(bangGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    const boardSize = game[0].boardSize;
    const emptyBoard = createEmptyBoard(boardSize);
    const stoneCounts = getStoneCount(boardSize);
    const newMines = generateMines(boardSize);

    // Delete all action history
    await db.delete(bangActions).where(eq(bangActions.gameId, gameId));

    // Reset the game with new mines
    await db.update(bangGames).set({
      boardState: emptyBoard,
      minePositions: newMines,
      blackPotCount: stoneCounts.black,
      whitePotCount: stoneCounts.white,
      blackCaptured: 0,
      whiteCaptured: 0,
      blackOnBoard: 0,
      whiteOnBoard: 0,
      blackExploded: 0,
      whiteExploded: 0,
      blackDroned: 0,
      whiteDroned: 0,
      lastMoveX: null,
      lastMoveY: null,
      lastExplosionX: null,
      lastExplosionY: null,
      lastDroneTargetX: null,
      lastDroneTargetY: null,
      koPointX: null,
      koPointY: null,
      currentTurn: 0,
      moveNumber: 0,
      updatedAt: new Date(),
    }).where(eq(bangGames.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: emptyBoard,
      blackPotCount: stoneCounts.black,
      whitePotCount: stoneCounts.white,
      blackCaptured: 0,
      whiteCaptured: 0,
      blackOnBoard: 0,
      whiteOnBoard: 0,
      blackExploded: 0,
      whiteExploded: 0,
      blackDroned: 0,
      whiteDroned: 0,
      lastMoveX: null,
      lastMoveY: null,
      lastExplosionX: null,
      lastExplosionY: null,
      lastDroneTargetX: null,
      lastDroneTargetY: null,
      koPointX: null,
      koPointY: null,
      currentTurn: 0,
    });
  } catch (error) {
    console.error('Error clearing bang game:', error);
    return NextResponse.json(
      { error: 'Failed to clear game' },
      { status: 500 }
    );
  }
}
