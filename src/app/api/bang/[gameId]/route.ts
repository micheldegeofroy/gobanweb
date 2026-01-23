import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bangGames } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/bang/[gameId] - Get game state (mines are hidden!)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    const game = await db
      .select()
      .from(bangGames)
      .where(eq(bangGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Return board state (DON'T include minePositions - they're secret!)
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
      blackExploded: game[0].blackExploded,
      whiteExploded: game[0].whiteExploded,
      blackDroned: game[0].blackDroned,
      whiteDroned: game[0].whiteDroned,
      lastMoveX: game[0].lastMoveX,
      lastMoveY: game[0].lastMoveY,
      lastExplosionX: game[0].lastExplosionX,
      lastExplosionY: game[0].lastExplosionY,
      lastDroneTargetX: game[0].lastDroneTargetX,
      lastDroneTargetY: game[0].lastDroneTargetY,
      koPointX: game[0].koPointX,
      koPointY: game[0].koPointY,
      currentTurn: game[0].currentTurn,
      moveNumber: game[0].moveNumber,
      connectedUsers: game[0].connectedUsers,
      publicKey: game[0].publicKey,
      updatedAt: game[0].updatedAt,
    });
  } catch (error) {
    console.error('Error fetching bang game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}
