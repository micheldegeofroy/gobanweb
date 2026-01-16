import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crazyGames } from '@/lib/db/schema';
import { generateKeyPair, generateGameId } from '@/lib/crypto/keys';
import { createEmptyBoard } from '@/lib/game/logic';
import { lt } from 'drizzle-orm';

// Stone counts for 4 players based on board size
// Black (Player 1) gets the extra stone
function getCrazyStoneCount(boardSize: number): { black: number; white: number; brown: number; grey: number } {
  if (boardSize === 9) return { black: 21, white: 20, brown: 20, grey: 20 };   // 81 total
  if (boardSize === 13) return { black: 43, white: 42, brown: 42, grey: 42 }; // 169 total
  return { black: 91, white: 90, brown: 90, grey: 90 }; // 19x19 - 361 total
}

// POST /api/crazy - Create a new 4-player crazy board
export async function POST(request: NextRequest) {
  try {
    // Clean up games older than 1 year (runs in background, don't await)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    db.delete(crazyGames).where(lt(crazyGames.createdAt, oneYearAgo)).catch((error) => {
      console.error('Background cleanup failed for crazy games:', error);
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
    const stoneCounts = getCrazyStoneCount(boardSize);

    // Insert game into database
    await db.insert(crazyGames).values({
      id: gameId,
      publicKey: keyPair.publicKey,
      boardSize,
      boardState: emptyBoard,
      blackPotCount: stoneCounts.black,
      whitePotCount: stoneCounts.white,
      brownPotCount: stoneCounts.brown,
      greyPotCount: stoneCounts.grey,
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
    console.error('Error creating crazy game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
