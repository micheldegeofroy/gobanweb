import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crazyGames } from '@/lib/db/schema';
import { generateKeyPair, generateGameId } from '@/lib/crypto/keys';
import { createEmptyBoard } from '@/lib/game/logic';

// Stone counts for 4 players based on board size
function getCrazyStoneCount(boardSize: number): { black: number; white: number; brown: number; grey: number } {
  if (boardSize === 9) return { black: 20, white: 20, brown: 20, grey: 21 };
  if (boardSize === 13) return { black: 42, white: 42, brown: 42, grey: 43 };
  return { black: 91, white: 90, brown: 90, grey: 90 }; // 19x19 - roughly 361/4
}

// POST /api/crazy - Create a new 4-player crazy board
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const boardSize = body.boardSize || 19;

    // Validate board size
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
