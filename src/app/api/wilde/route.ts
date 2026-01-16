import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wildeGames } from '@/lib/db/schema';
import { generateKeyPair, generateGameId } from '@/lib/crypto/keys';
import { createEmptyBoard, initializeStonePots } from '@/lib/wilde/colors';
import { lt } from 'drizzle-orm';

// POST /api/wilde - Create a new Wilde Go game
export async function POST(request: NextRequest) {
  try {
    // Clean up games older than 1 year (runs in background, don't await)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    db.delete(wildeGames).where(lt(wildeGames.createdAt, oneYearAgo)).catch((error) => {
      console.error('Background cleanup failed for wilde games:', error);
    });

    const body = await request.json();
    const boardWidth = body.boardWidth ?? 19;
    const boardHeight = body.boardHeight ?? 19;
    const playerCount = body.playerCount ?? 2;
    const stonesPerPlayer = body.stonesPerPlayer ?? null; // null means auto-calculate
    const pacmanMode = body.pacmanMode ?? false;
    const customHues = body.customHues ?? null;

    // Validate board dimensions type
    if (typeof boardWidth !== 'number' || !Number.isInteger(boardWidth) ||
        typeof boardHeight !== 'number' || !Number.isInteger(boardHeight)) {
      return NextResponse.json(
        { error: 'Invalid board dimensions. Width and height must be integers.' },
        { status: 400 }
      );
    }

    // Validate board dimensions (3-20)
    if (boardWidth < 3 || boardWidth > 20 || boardHeight < 3 || boardHeight > 20) {
      return NextResponse.json(
        { error: 'Invalid board dimensions. Width and height must be 3-20.' },
        { status: 400 }
      );
    }

    // Validate player count type
    if (typeof playerCount !== 'number' || !Number.isInteger(playerCount)) {
      return NextResponse.json(
        { error: 'Invalid player count. Must be an integer.' },
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
    const stonePots = initializeStonePots(boardWidth, boardHeight, playerCount, stonesPerPlayer);

    // Insert game into database
    await db.insert(wildeGames).values({
      id: gameId,
      publicKey: keyPair.publicKey,
      boardWidth,
      boardHeight,
      playerCount,
      boardState: emptyBoard,
      stonePots,
      pacmanMode,
      customHues,
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
      pacmanMode,
    });
  } catch (error) {
    console.error('Error creating Wilde game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
