import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crazyGames, crazyActions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';

// POST /api/crazy/[gameId]/clear - Clear the board
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
      .from(crazyGames)
      .where(eq(crazyGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    const boardSize = game[0].boardSize;
    const emptyBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));

    // Calculate initial pot counts based on board size (total intersections)
    // Black (Player 1) gets the extra stone
    const getCrazyStones = (size: number) => {
      if (size === 9) return { black: 21, white: 20, brown: 20, grey: 20 };   // 81 total
      if (size === 13) return { black: 43, white: 42, brown: 42, grey: 42 }; // 169 total
      return { black: 91, white: 90, brown: 90, grey: 90 }; // 361 total
    };
    const stones = getCrazyStones(boardSize);

    // Delete all actions for this game
    await db.delete(crazyActions).where(eq(crazyActions.gameId, gameId));

    // Reset the board
    await db.update(crazyGames).set({
      boardState: emptyBoard,
      blackPotCount: stones.black,
      whitePotCount: stones.white,
      brownPotCount: stones.brown,
      greyPotCount: stones.grey,
      blackCaptured: 0,
      whiteCaptured: 0,
      brownCaptured: 0,
      greyCaptured: 0,
      lastMoveX: null,
      lastMoveY: null,
      koPointX: null,
      koPointY: null,
      currentTurn: 0,
      moveNumber: 0,
      updatedAt: new Date(),
    }).where(eq(crazyGames.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: emptyBoard,
      blackPotCount: stones.black,
      whitePotCount: stones.white,
      brownPotCount: stones.brown,
      greyPotCount: stones.grey,
      blackCaptured: 0,
      whiteCaptured: 0,
      brownCaptured: 0,
      greyCaptured: 0,
      lastMoveX: null,
      lastMoveY: null,
      koPointX: null,
      koPointY: null,
      currentTurn: 0,
      moveNumber: 0,
    });
  } catch (error) {
    console.error('Error clearing board:', error);
    return NextResponse.json({ error: 'Failed to clear board' }, { status: 500 });
  }
}
