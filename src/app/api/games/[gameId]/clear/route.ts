import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, actions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';

// POST /api/games/[gameId]/clear - Clear the board
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
      .from(games)
      .where(eq(games.id, gameId))
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
    const blackStones = boardSize === 9 ? 41 : boardSize === 13 ? 85 : 181;
    const whiteStones = boardSize === 9 ? 40 : boardSize === 13 ? 84 : 180;

    // Delete all actions for this game
    await db.delete(actions).where(eq(actions.gameId, gameId));

    // Reset the board
    await db.update(games).set({
      boardState: emptyBoard,
      blackPotCount: blackStones,
      whitePotCount: whiteStones,
      blackCaptured: 0,
      whiteCaptured: 0,
      blackOnBoard: 0,
      whiteOnBoard: 0,
      lastMoveX: null,
      lastMoveY: null,
      koPointX: null,
      koPointY: null,
      updatedAt: new Date(),
    }).where(eq(games.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: emptyBoard,
      blackPotCount: blackStones,
      whitePotCount: whiteStones,
      blackCaptured: 0,
      whiteCaptured: 0,
      blackOnBoard: 0,
      whiteOnBoard: 0,
      lastMoveX: null,
      lastMoveY: null,
      koPointX: null,
      koPointY: null,
    });
  } catch (error) {
    console.error('Error clearing board:', error);
    return NextResponse.json({ error: 'Failed to clear board' }, { status: 500 });
  }
}
