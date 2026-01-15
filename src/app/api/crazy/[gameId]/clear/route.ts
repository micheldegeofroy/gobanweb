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

    // Calculate initial pot counts based on board size
    const totalStones = boardSize === 9 ? 41 : boardSize === 13 ? 85 : 181;
    const perPlayer = Math.floor(totalStones / 4);
    const extraForBlack = totalStones % 4 > 0 ? 1 : 0;

    // Delete all actions for this game
    await db.delete(crazyActions).where(eq(crazyActions.gameId, gameId));

    // Reset the board
    await db.update(crazyGames).set({
      boardState: emptyBoard,
      blackPotCount: perPlayer + extraForBlack,
      whitePotCount: perPlayer,
      brownPotCount: perPlayer,
      greyPotCount: perPlayer,
      blackReturned: 0,
      whiteReturned: 0,
      brownReturned: 0,
      greyReturned: 0,
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
      blackPotCount: perPlayer + extraForBlack,
      whitePotCount: perPlayer,
      brownPotCount: perPlayer,
      greyPotCount: perPlayer,
      blackReturned: 0,
      whiteReturned: 0,
      brownReturned: 0,
      greyReturned: 0,
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
