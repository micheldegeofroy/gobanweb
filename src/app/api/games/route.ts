import { NextRequest, NextResponse } from 'next/server';
import { db, games } from '@/lib/db';
import { generateKeyPair, generateGameId } from '@/lib/crypto/keys';
import { createEmptyBoard } from '@/lib/game/logic';
import { lt } from 'drizzle-orm';

// Stone counts: each player gets ALL intersections, Black (starter) gets +1
function getStoneCount(boardSize: number): { black: number; white: number } {
  const totalIntersections = boardSize * boardSize;
  return { black: totalIntersections + 1, white: totalIntersections };
}

// POST /api/games - Create a new shared board
export async function POST(request: NextRequest) {
  try {
    // Clean up games older than 1 year (runs in background, don't await)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    db.delete(games).where(lt(games.createdAt, oneYearAgo)).catch((error) => {
      console.error('Background cleanup failed for games:', error);
    });

    const body = await request.json();
    const boardSize = body.boardSize ?? 19;

    // Validate board size type and value
    if (typeof boardSize !== 'number' || !Number.isInteger(boardSize)) {
      return NextResponse.json(
        { error: 'Invalid board size. Must be an integer.' },
        { status: 400 }
      );
    }

    if (![9, 13, 19].includes(boardSize)) {
      return NextResponse.json(
        { error: 'Invalid board size. Must be 9, 13, or 19.' },
        { status: 400 }
      );
    }

    // Generate key pair for authentication
    const keyPair = await generateKeyPair();
    const gameId = await generateGameId(keyPair.publicKey);

    // Create empty board
    const emptyBoard = createEmptyBoard(boardSize);
    const stoneCounts = getStoneCount(boardSize);

    // Insert game into database
    await db.insert(games).values({
      id: gameId,
      publicKey: keyPair.publicKey,
      boardSize,
      boardState: emptyBoard,
      blackPotCount: stoneCounts.black,
      whitePotCount: stoneCounts.white,
      connectedUsers: 0,
    });

    // Return game info with private key (only shown once!)
    return NextResponse.json({
      gameId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      boardSize,
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
