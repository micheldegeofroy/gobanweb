import { NextRequest, NextResponse } from 'next/server';
import { db, games, actions } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

// GET /api/games/[gameId]/history - Get all actions for a game in chronological order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Get the game to verify it exists and get board size
    const game = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get all actions for this game in chronological order
    const gameActions = await db
      .select()
      .from(actions)
      .where(eq(actions.gameId, gameId))
      .orderBy(asc(actions.createdAt));

    return NextResponse.json({
      boardSize: game[0].boardSize,
      actions: gameActions,
    });
  } catch (error) {
    console.error('Error fetching game history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game history' },
      { status: 500 }
    );
  }
}
