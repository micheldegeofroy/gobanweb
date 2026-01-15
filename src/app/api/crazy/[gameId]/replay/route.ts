import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crazyGames, crazyActions } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/crazy/[gameId]/replay - Get all actions for replay
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

    const actions = await db
      .select()
      .from(crazyActions)
      .where(eq(crazyActions.gameId, gameId))
      .orderBy(asc(crazyActions.moveNumber));

    return NextResponse.json({
      boardSize: game[0].boardSize,
      actions: actions.map(a => ({
        actionType: a.actionType,
        stoneColor: a.stoneColor,
        fromX: a.fromX,
        fromY: a.fromY,
        toX: a.toX,
        toY: a.toY,
        moveNumber: a.moveNumber,
      })),
    });
  } catch (error) {
    console.error('Error fetching replay:', error);
    return NextResponse.json({ error: 'Failed to fetch replay' }, { status: 500 });
  }
}
