import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bangGames } from '@/lib/db/schema';
import { generateKeyPair, generateGameId } from '@/lib/crypto/keys';
import { createEmptyBoard } from '@/lib/game/logic';
import { lt } from 'drizzle-orm';
import type { MinePosition } from '@/lib/db/schema';

// Stone counts: each player gets ALL intersections, Black (starter) gets +1
function getStoneCount(boardSize: number): { black: number; white: number } {
  const totalIntersections = boardSize * boardSize;
  return { black: totalIntersections + 1, white: totalIntersections };
}

// Generate random mine positions (10% of intersections)
function generateMines(boardSize: number): MinePosition[] {
  const totalIntersections = boardSize * boardSize;
  const mineCount = Math.floor(totalIntersections * 0.1);
  const mines: MinePosition[] = [];
  const used = new Set<string>();

  while (mines.length < mineCount) {
    const x = Math.floor(Math.random() * boardSize);
    const y = Math.floor(Math.random() * boardSize);
    const key = `${x},${y}`;

    if (!used.has(key)) {
      used.add(key);
      mines.push({ x, y });
    }
  }

  return mines;
}

// POST /api/bang - Create a new Go Bang game
export async function POST(request: NextRequest) {
  try {
    // Clean up games older than 1 year (runs in background)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    db.delete(bangGames).where(lt(bangGames.createdAt, oneYearAgo)).catch((error) => {
      console.error('Background cleanup failed for bang games:', error);
    });

    const body = await request.json();
    const boardSize = body.boardSize ?? 19;

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

    // Create empty board and generate mines
    const emptyBoard = createEmptyBoard(boardSize);
    const stoneCounts = getStoneCount(boardSize);
    const minePositions = generateMines(boardSize);

    // Insert game into database
    await db.insert(bangGames).values({
      id: gameId,
      publicKey: keyPair.publicKey,
      boardSize,
      boardState: emptyBoard,
      minePositions,
      blackPotCount: stoneCounts.black,
      whitePotCount: stoneCounts.white,
      connectedUsers: 0,
    });

    return NextResponse.json({
      gameId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      boardSize,
      mineCount: minePositions.length,
    });
  } catch (error) {
    console.error('Error creating bang game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
