import { NextRequest, NextResponse } from 'next/server';
import { db, games } from '@/lib/db';
import { generateKeyPair, generateGameId } from '@/lib/crypto/keys';
import { createEmptyBoard } from '@/lib/game/logic';

// Standard stone counts based on board size
function getStoneCount(boardSize: number): { black: number; white: number } {
  if (boardSize === 9) return { black: 40, white: 40 };
  if (boardSize === 13) return { black: 80, white: 80 };
  return { black: 181, white: 180 }; // 19x19
}

// POST /api/games - Create a new shared board
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
