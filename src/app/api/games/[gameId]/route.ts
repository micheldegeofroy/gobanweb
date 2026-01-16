import { NextRequest, NextResponse } from 'next/server';
import { db, games } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET /api/games/[gameId] - Get board state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    const game = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Return board state
    return NextResponse.json({
      id: game[0].id,
      boardSize: game[0].boardSize,
      boardState: game[0].boardState,
      blackPotCount: game[0].blackPotCount,
      whitePotCount: game[0].whitePotCount,
      blackCaptured: game[0].blackCaptured,
      whiteCaptured: game[0].whiteCaptured,
      blackOnBoard: game[0].blackOnBoard,
      whiteOnBoard: game[0].whiteOnBoard,
      lastMoveX: game[0].lastMoveX,
      lastMoveY: game[0].lastMoveY,
      koPointX: game[0].koPointX,
      koPointY: game[0].koPointY,
      connectedUsers: game[0].connectedUsers,
      publicKey: game[0].publicKey,
      updatedAt: game[0].updatedAt,
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}
