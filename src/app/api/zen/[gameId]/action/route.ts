import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { zenGames, zenActions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import { randomUUID } from 'crypto';
import { errorResponse, ERROR_IDS } from '@/lib/errors';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import {
  getAdjacentSquare,
  getGroupSquare,
  countLibertiesSquare,
  wouldBeSuicideSquare,
  detectAndRemoveCaptures,
  type GenericBoard,
} from '@/lib/game/shared';

type ZenStone = 0 | 1 | null;
type ZenBoard = ZenStone[][];

// POST /api/zen/[gameId]/action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitKey = `zen:action:${gameId}:${clientIP}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.gameAction);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        }
      );
    }

    const body = await request.json();
    const { privateKey, actionType, fromX, fromY, toX, toY } = body;

    if (!privateKey) {
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    const game = await db
      .select()
      .from(zenGames)
      .where(eq(zenGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    const boardState = game[0].boardState as ZenBoard;
    const boardSize = game[0].boardSize;
    let newBoardState = boardState.map(row => [...row]) as GenericBoard;
    let newSharedPotCount = game[0].sharedPotCount;
    let newNextStoneColor = game[0].nextStoneColor;
    let newPlayer1Captured = game[0].player1Captured;
    let newPlayer2Captured = game[0].player2Captured;
    let newPlayer3Captured = game[0].player3Captured;
    let newLastMoveX: number | null = game[0].lastMoveX;
    let newLastMoveY: number | null = game[0].lastMoveY;
    let newKoPointX: number | null = null;
    let newKoPointY: number | null = null;
    const currentKoPointX = game[0].koPointX;
    const currentKoPointY = game[0].koPointY;
    let currentTurn = game[0].currentTurn;

    // The stone color for this action is determined by nextStoneColor
    const stoneColor = newNextStoneColor;

    switch (actionType) {
      case 'place': {
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (toX < 0 || toX >= boardSize || toY < 0 || toY >= boardSize) {
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }
        if (newBoardState[toY][toX] !== null) {
          return NextResponse.json({ error: 'Position is occupied' }, { status: 400 });
        }

        // Check suicide
        if (wouldBeSuicideSquare(newBoardState, toX, toY, stoneColor, boardSize)) {
          const err = await errorResponse(ERROR_IDS.ZEN_SUICIDE_NOT_ALLOWED, 'Suicide move not allowed', 400);
          if (err) return err;
        }

        // Check Ko
        if (currentKoPointX !== null && currentKoPointY !== null && toX === currentKoPointX && toY === currentKoPointY) {
          const err = await errorResponse(ERROR_IDS.ZEN_KO_VIOLATION, 'Ko rule violation', 400);
          if (err) return err;
        }

        // Place stone
        newBoardState[toY][toX] = stoneColor;
        newSharedPotCount--;

        newLastMoveX = toX;
        newLastMoveY = toY;

        // Advance turn to next player (3 players)
        currentTurn = (currentTurn + 1) % 3;
        // Alternate stone color
        newNextStoneColor = 1 - newNextStoneColor;
        break;
      }

      case 'remove': {
        if (typeof fromX !== 'number' || typeof fromY !== 'number') {
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (fromX < 0 || fromX >= boardSize || fromY < 0 || fromY >= boardSize) {
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }

        const stone = newBoardState[fromY][fromX];
        if (stone === null) {
          return NextResponse.json({ error: 'No stone at position' }, { status: 400 });
        }

        newBoardState[fromY][fromX] = null;
        newSharedPotCount++;
        break;
      }

      case 'move': {
        if (typeof fromX !== 'number' || typeof fromY !== 'number') {
          return NextResponse.json({ error: 'Invalid from position' }, { status: 400 });
        }
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          return NextResponse.json({ error: 'Invalid to position' }, { status: 400 });
        }
        if (fromX < 0 || fromX >= boardSize || fromY < 0 || fromY >= boardSize) {
          return NextResponse.json({ error: 'From position out of bounds' }, { status: 400 });
        }
        if (toX < 0 || toX >= boardSize || toY < 0 || toY >= boardSize) {
          return NextResponse.json({ error: 'To position out of bounds' }, { status: 400 });
        }
        if (fromX === toX && fromY === toY) {
          return NextResponse.json({ error: 'Cannot move to same position' }, { status: 400 });
        }

        const stone = newBoardState[fromY][fromX];
        if (stone === null) {
          return NextResponse.json({ error: 'No stone at from position' }, { status: 400 });
        }
        if (newBoardState[toY][toX] !== null) {
          return NextResponse.json({ error: 'To position is occupied' }, { status: 400 });
        }

        const testBoard = newBoardState.map(row => [...row]) as GenericBoard;
        testBoard[fromY][fromX] = null;
        if (wouldBeSuicideSquare(testBoard, toX, toY, stone, boardSize)) {
          const err = await errorResponse(ERROR_IDS.ZEN_SUICIDE_NOT_ALLOWED, 'Suicide move not allowed', 400);
          if (err) return err;
        }

        newBoardState[fromY][fromX] = null;
        newBoardState[toY][toX] = stone;
        break;
      }

      default: {
        const err = await errorResponse(ERROR_IDS.ZEN_INVALID_ACTION, 'Invalid action type', 400);
        if (err) return err;
      }
    }

    // Check for captures after place or move
    if (actionType === 'place' || actionType === 'move') {
      const placedX = toX as number;
      const placedY = toY as number;
      const captureResult = detectAndRemoveCaptures(newBoardState, boardSize, boardSize, placedX, placedY);
      newBoardState = captureResult.newBoard;

      // Get total captured stones and credit to the player who made the move
      let totalCaptured = 0;
      captureResult.capturedByColor.forEach((count) => {
        totalCaptured += count;
      });

      // For place actions, the player who just placed gets the captures
      // currentTurn was already advanced, so the player who placed is (currentTurn + 2) % 3
      if (totalCaptured > 0) {
        const capturingPlayer = actionType === 'place' ? (currentTurn + 2) % 3 : null;

        if (capturingPlayer === 0) newPlayer1Captured += totalCaptured;
        else if (capturingPlayer === 1) newPlayer2Captured += totalCaptured;
        else if (capturingPlayer === 2) newPlayer3Captured += totalCaptured;
      }

      if (captureResult.koPoint) {
        newKoPointX = captureResult.koPoint.x;
        newKoPointY = captureResult.koPoint.y;
      }
    }

    // Use SQL increment to avoid race condition on moveNumber
    const updateResult = await db.update(zenGames).set({
      boardState: newBoardState as ZenBoard,
      sharedPotCount: newSharedPotCount,
      nextStoneColor: newNextStoneColor,
      player1Captured: newPlayer1Captured,
      player2Captured: newPlayer2Captured,
      player3Captured: newPlayer3Captured,
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
      currentTurn: currentTurn,
      moveNumber: sql`${zenGames.moveNumber} + 1`,
      updatedAt: new Date(),
    }).where(eq(zenGames.id, gameId)).returning({ moveNumber: zenGames.moveNumber });

    const newMoveNumber = updateResult[0]?.moveNumber ?? game[0].moveNumber + 1;

    // Log the action for replay
    await db.insert(zenActions).values({
      id: randomUUID(),
      gameId,
      actionType,
      stoneColor: actionType === 'place' ? stoneColor : (newBoardState[toY!]?.[toX!] ?? null),
      playerIndex: actionType === 'place' ? (currentTurn + 2) % 3 : null,
      fromX: fromX ?? null,
      fromY: fromY ?? null,
      toX: toX ?? null,
      toY: toY ?? null,
      moveNumber: newMoveNumber,
    });

    return NextResponse.json({
      success: true,
      boardState: newBoardState,
      sharedPotCount: newSharedPotCount,
      nextStoneColor: newNextStoneColor,
      player1Captured: newPlayer1Captured,
      player2Captured: newPlayer2Captured,
      player3Captured: newPlayer3Captured,
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
      currentTurn: currentTurn,
      moveNumber: newMoveNumber,
    });
  } catch (error) {
    console.error('Error performing action:', error);
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
