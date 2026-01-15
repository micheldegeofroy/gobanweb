import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wildeGames, wildeActions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import { createEmptyBoard, initializeStonePots } from '@/lib/wilde/colors';

// POST /api/wilde/[gameId]/clear - Clear board and reset
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
      .from(wildeGames)
      .where(eq(wildeGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    const width = game[0].boardWidth;
    const height = game[0].boardHeight;
    const playerCount = game[0].playerCount;

    // Create fresh board and pots
    const emptyBoard = createEmptyBoard(width, height);
    const freshPots = initializeStonePots(width, height, playerCount);

    // Delete all actions
    await db.delete(wildeActions).where(eq(wildeActions.gameId, gameId));

    // Reset the game
    await db.update(wildeGames).set({
      boardState: emptyBoard,
      stonePots: freshPots,
      lastMoveX: null,
      lastMoveY: null,
      koPointX: null,
      koPointY: null,
      currentTurn: 0,
      moveNumber: 0,
      updatedAt: new Date(),
    }).where(eq(wildeGames.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: emptyBoard,
      stonePots: freshPots,
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
