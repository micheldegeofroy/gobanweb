import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wildeGames, wildeActions } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/wilde/[gameId]/replay - Get action history for replay
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

    const actions = await db
      .select()
      .from(wildeActions)
      .where(eq(wildeActions.gameId, gameId))
      .orderBy(asc(wildeActions.moveNumber));

    return NextResponse.json({
      boardWidth: game[0].boardWidth,
      boardHeight: game[0].boardHeight,
      playerCount: game[0].playerCount,
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
