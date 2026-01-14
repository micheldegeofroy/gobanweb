import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crazyGames } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/crazy/[gameId] - Get crazy board state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    const game = await db
      .select()
      .from(crazyGames)
      .where(eq(crazyGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Return board state with all 4 colors
    return NextResponse.json({
      id: game[0].id,
      boardSize: game[0].boardSize,
      boardState: game[0].boardState,
      blackPotCount: game[0].blackPotCount,
      whitePotCount: game[0].whitePotCount,
      brownPotCount: game[0].brownPotCount,
      greyPotCount: game[0].greyPotCount,
      blackReturned: game[0].blackReturned,
      whiteReturned: game[0].whiteReturned,
      brownReturned: game[0].brownReturned,
      greyReturned: game[0].greyReturned,
      lastMoveX: game[0].lastMoveX,
      lastMoveY: game[0].lastMoveY,
      koPointX: game[0].koPointX,
      koPointY: game[0].koPointY,
      connectedUsers: game[0].connectedUsers,
      publicKey: game[0].publicKey,
      updatedAt: game[0].updatedAt,
    });
  } catch (error) {
    console.error('Error fetching crazy game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}
