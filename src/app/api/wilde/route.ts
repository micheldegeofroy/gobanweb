import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wildeGames } from '@/lib/db/schema';
import { generateKeyPair, generateGameId } from '@/lib/crypto/keys';
import { createEmptyBoard, initializeStonePots } from '@/lib/wilde/colors';

// POST /api/wilde - Create a new Wilde Go game
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const boardWidth = body.boardWidth ?? 19;
    const boardHeight = body.boardHeight ?? 19;
    const playerCount = body.playerCount ?? 2;

    // Validate board dimensions (3-20)
    if (boardWidth < 3 || boardWidth > 20 || boardHeight < 3 || boardHeight > 20) {
      return NextResponse.json(
        { error: 'Invalid board dimensions. Width and height must be 3-20.' },
        { status: 400 }
      );
    }

    // Validate player count (2-8)
    if (playerCount < 2 || playerCount > 8) {
      return NextResponse.json(
        { error: 'Invalid player count. Must be 2-8 players.' },
        { status: 400 }
      );
    }

    // Generate key pair for authentication
    const keyPair = await generateKeyPair();
    const gameId = await generateGameId(keyPair.publicKey);

    // Create empty board and initialize stone pots
    const emptyBoard = createEmptyBoard(boardWidth, boardHeight);
    const stonePots = initializeStonePots(boardWidth, boardHeight, playerCount);

    // Insert game into database
    await db.insert(wildeGames).values({
      id: gameId,
      publicKey: keyPair.publicKey,
      boardWidth,
      boardHeight,
      playerCount,
      boardState: emptyBoard,
      stonePots,
      connectedUsers: 0,
    });

    // Return game info with private key (only shown once!)
    return NextResponse.json({
      gameId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      boardWidth,
      boardHeight,
      playerCount,
    });
  } catch (error) {
    console.error('Error creating Wilde game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
