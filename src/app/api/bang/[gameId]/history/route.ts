import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bangGames, bangActions } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/bang/[gameId]/history - Get action history for replay
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

    const actions = await db
      .select()
      .from(bangActions)
      .where(eq(bangActions.gameId, gameId))
      .orderBy(asc(bangActions.createdAt));

    return NextResponse.json({
      boardSize: game[0].boardSize,
      actions: actions.map(a => ({
        id: a.id,
        gameId: a.gameId,
        actionType: a.actionType,
        stoneColor: a.stoneColor,
        fromX: a.fromX,
        fromY: a.fromY,
        toX: a.toX,
        toY: a.toY,
        moveNumber: a.moveNumber,
        explosion: a.explosion,
        droneStrike: a.droneStrike,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching bang history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
