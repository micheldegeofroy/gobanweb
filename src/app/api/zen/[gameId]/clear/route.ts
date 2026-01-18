import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { zenGames, zenActions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';

// Calculate initial pot count: boardSize * boardSize + 1
function getInitialPotCount(boardSize: number): number {
  return boardSize * boardSize + 1;
}

// POST /api/zen/[gameId]/clear - Clear the board
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
      .from(zenGames)
      .where(eq(zenGames.id, gameId))
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
    const initialPotCount = getInitialPotCount(boardSize);

    // Delete all actions for this game
    await db.delete(zenActions).where(eq(zenActions.gameId, gameId));

    // Reset the board
    await db.update(zenGames).set({
      boardState: emptyBoard,
      sharedPotCount: initialPotCount,
      nextStoneColor: 0, // Reset to black first
      player1Captured: 0,
      player2Captured: 0,
      player3Captured: 0,
      lastMoveX: null,
      lastMoveY: null,
      koPointX: null,
      koPointY: null,
      currentTurn: 0,
      moveNumber: 0,
      updatedAt: new Date(),
    }).where(eq(zenGames.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: emptyBoard,
      sharedPotCount: initialPotCount,
      nextStoneColor: 0,
      player1Captured: 0,
      player2Captured: 0,
      player3Captured: 0,
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
