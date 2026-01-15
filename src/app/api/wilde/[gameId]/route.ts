import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wildeGames } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/wilde/[gameId] - Get Wilde game state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    const game = await db
      .select()
      .from(wildeGames)
      .where(eq(wildeGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: game[0].id,
      boardWidth: game[0].boardWidth,
      boardHeight: game[0].boardHeight,
      playerCount: game[0].playerCount,
      boardState: game[0].boardState,
      stonePots: game[0].stonePots,
      lastMoveX: game[0].lastMoveX,
      lastMoveY: game[0].lastMoveY,
      koPointX: game[0].koPointX,
      koPointY: game[0].koPointY,
      currentTurn: game[0].currentTurn,
      connectedUsers: game[0].connectedUsers,
      publicKey: game[0].publicKey,
      updatedAt: game[0].updatedAt,
    });
  } catch (error) {
    console.error('Error fetching Wilde game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}
