import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { zenGames } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/zen/[gameId] - Get Zen Go board state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    const game = await db
      .select()
      .from(zenGames)
      .where(eq(zenGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Return board state
    return NextResponse.json({
      id: game[0].id,
      boardSize: game[0].boardSize,
      boardState: game[0].boardState,
      sharedPotCount: game[0].sharedPotCount,
      nextStoneColor: game[0].nextStoneColor,
      player1Captured: game[0].player1Captured,
      player2Captured: game[0].player2Captured,
      player3Captured: game[0].player3Captured,
      currentTurn: game[0].currentTurn,
      lastMoveX: game[0].lastMoveX,
      lastMoveY: game[0].lastMoveY,
      koPointX: game[0].koPointX,
      koPointY: game[0].koPointY,
      moveNumber: game[0].moveNumber,
      connectedUsers: game[0].connectedUsers,
      publicKey: game[0].publicKey,
      updatedAt: game[0].updatedAt,
    });
  } catch (error) {
    console.error('Error fetching zen game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}
