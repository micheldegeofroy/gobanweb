import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crazyGames, crazyActions } from '@/lib/db/schema';
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
  type Position,
} from '@/lib/game/shared';

type CrazyStone = 0 | 1 | 2 | 3 | null;
type CrazyBoard = CrazyStone[][];

// POST /api/crazy/[gameId]/action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitKey = `crazy:action:${gameId}:${clientIP}`;
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
    const { privateKey, actionType, stoneColor, fromX, fromY, toX, toY } = body;

    if (!privateKey) {
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    const game = await db
      .select()
      .from(crazyGames)
      .where(eq(crazyGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    const boardState = game[0].boardState as CrazyBoard;
    const boardSize = game[0].boardSize;
    let newBoardState = boardState.map(row => [...row]) as GenericBoard;
    let newBlackPotCount = game[0].blackPotCount;
    let newWhitePotCount = game[0].whitePotCount;
    let newBrownPotCount = game[0].brownPotCount;
    let newGreyPotCount = game[0].greyPotCount;
    let newBlackCaptured = game[0].blackCaptured;
    let newWhiteCaptured = game[0].whiteCaptured;
    let newBrownCaptured = game[0].brownCaptured;
    let newGreyCaptured = game[0].greyCaptured;
    let newLastMoveX: number | null = game[0].lastMoveX;
    let newLastMoveY: number | null = game[0].lastMoveY;
    let newKoPointX: number | null = null;
    let newKoPointY: number | null = null;
    const currentKoPointX = game[0].koPointX;
    const currentKoPointY = game[0].koPointY;
    let currentTurn = game[0].currentTurn;

    switch (actionType) {
      case 'place': {
        if (typeof stoneColor !== 'number' || ![0, 1, 2, 3].includes(stoneColor)) {
          return NextResponse.json({ error: 'Invalid stone color' }, { status: 400 });
        }
        // Enforce turn order
        if (stoneColor !== currentTurn) {
          const err = await errorResponse(ERROR_IDS.CRAZY_NOT_YOUR_TURN, 'Not your turn', 400);
          if (err) return err;
        }
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (toX < 0 || toX >= boardSize || toY < 0 || toY >= boardSize) {
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }
        if (newBoardState[toY][toX] !== null) {
          return NextResponse.json({ error: 'Position is occupied' }, { status: 400 });
        }

        // Check pot has stones
        const potCounts = {
          0: newBlackPotCount,
          1: newWhitePotCount,
          2: newBrownPotCount,
          3: newGreyPotCount,
        };

        if (potCounts[stoneColor as 0|1|2|3] <= 0) {
          return NextResponse.json({ error: 'No stones of this color in pot' }, { status: 400 });
        }

        // Check suicide
        if (wouldBeSuicideSquare(newBoardState, toX, toY, stoneColor, boardSize)) {
          const err = await errorResponse(ERROR_IDS.CRAZY_SUICIDE_NOT_ALLOWED, 'Suicide move not allowed', 400);
          if (err) return err;
        }

        // Check Ko
        if (currentKoPointX !== null && currentKoPointY !== null && toX === currentKoPointX && toY === currentKoPointY) {
          const err = await errorResponse(ERROR_IDS.CRAZY_KO_VIOLATION, 'Ko rule violation', 400);
          if (err) return err;
        }

        // Place stone
        newBoardState[toY][toX] = stoneColor;
        if (stoneColor === 0) newBlackPotCount--;
        else if (stoneColor === 1) newWhitePotCount--;
        else if (stoneColor === 2) newBrownPotCount--;
        else if (stoneColor === 3) newGreyPotCount--;

        newLastMoveX = toX;
        newLastMoveY = toY;
        currentTurn = (currentTurn + 1) % 4;
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
        if (stone === 0) newBlackPotCount++;
        else if (stone === 1) newWhitePotCount++;
        else if (stone === 2) newBrownPotCount++;
        else if (stone === 3) newGreyPotCount++;
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
          const err = await errorResponse(ERROR_IDS.CRAZY_SUICIDE_NOT_ALLOWED, 'Suicide move not allowed', 400);
          if (err) return err;
        }

        newBoardState[fromY][fromX] = null;
        newBoardState[toY][toX] = stone;
        break;
      }

      default: {
        const err = await errorResponse(ERROR_IDS.CRAZY_INVALID_ACTION, 'Invalid action type', 400);
        if (err) return err;
      }
    }

    // Check for captures after place or move
    if (actionType === 'place' || actionType === 'move') {
      const placedX = toX as number;
      const placedY = toY as number;
      const captureResult = detectAndRemoveCaptures(newBoardState, boardSize, boardSize, placedX, placedY);
      newBoardState = captureResult.newBoard;

      // Japanese scoring: captured stones go to the capturing player's score
      const capturingColor = actionType === 'place' ? stoneColor : newBoardState[placedY][placedX];
      let totalCaptured = 0;
      captureResult.capturedByColor.forEach((count) => {
        totalCaptured += count;
      });

      if (totalCaptured > 0 && capturingColor !== null && capturingColor !== undefined) {
        if (capturingColor === 0) newBlackCaptured += totalCaptured;
        else if (capturingColor === 1) newWhiteCaptured += totalCaptured;
        else if (capturingColor === 2) newBrownCaptured += totalCaptured;
        else if (capturingColor === 3) newGreyCaptured += totalCaptured;
      }

      if (captureResult.koPoint) {
        newKoPointX = captureResult.koPoint.x;
        newKoPointY = captureResult.koPoint.y;
      }
    }

    // Use SQL increment to avoid race condition on moveNumber
    // First, atomically increment and get the new value
    const updateResult = await db.update(crazyGames).set({
      boardState: newBoardState as CrazyBoard,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      brownPotCount: newBrownPotCount,
      greyPotCount: newGreyPotCount,
      blackCaptured: newBlackCaptured,
      whiteCaptured: newWhiteCaptured,
      brownCaptured: newBrownCaptured,
      greyCaptured: newGreyCaptured,
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
      currentTurn: currentTurn,
      moveNumber: sql`${crazyGames.moveNumber} + 1`,
      updatedAt: new Date(),
    }).where(eq(crazyGames.id, gameId)).returning({ moveNumber: crazyGames.moveNumber });

    const newMoveNumber = updateResult[0]?.moveNumber ?? game[0].moveNumber + 1;

    // Log the action for replay
    await db.insert(crazyActions).values({
      id: randomUUID(),
      gameId,
      actionType,
      stoneColor: stoneColor ?? null,
      fromX: fromX ?? null,
      fromY: fromY ?? null,
      toX: toX ?? null,
      toY: toY ?? null,
      moveNumber: newMoveNumber,
    });

    return NextResponse.json({
      success: true,
      boardState: newBoardState,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      brownPotCount: newBrownPotCount,
      greyPotCount: newGreyPotCount,
      blackCaptured: newBlackCaptured,
      whiteCaptured: newWhiteCaptured,
      brownCaptured: newBrownCaptured,
      greyCaptured: newGreyCaptured,
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
