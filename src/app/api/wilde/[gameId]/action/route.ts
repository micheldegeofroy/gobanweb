import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wildeGames, wildeActions, StonePot } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import { randomUUID } from 'crypto';
import { errorResponse, ERROR_IDS } from '@/lib/errors';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import {
  wouldBeSuicide,
  detectAndRemoveCaptures,
  isValidPosition,
  type GenericBoard,
} from '@/lib/game/shared';

type WildeStone = number | null;
type WildeBoard = WildeStone[][];

// POST /api/wilde/[gameId]/action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitKey = `wilde:action:${gameId}:${clientIP}`;
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
      const err = await errorResponse(ERROR_IDS.WILDE_PRIVATE_KEY_REQUIRED, 'Private key is required', 400);
      if (err) return err;
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    const game = await db
      .select()
      .from(wildeGames)
      .where(eq(wildeGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      const err = await errorResponse(ERROR_IDS.WILDE_GAME_NOT_FOUND, 'Game not found', 404);
      if (err) return err;
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      const err = await errorResponse(ERROR_IDS.WILDE_INVALID_PRIVATE_KEY, 'Invalid private key', 401);
      if (err) return err;
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    const boardState = game[0].boardState as WildeBoard;
    const width = game[0].boardWidth;
    const height = game[0].boardHeight;
    const playerCount = game[0].playerCount;
    let newBoardState = boardState.map(row => [...row]) as GenericBoard;
    let newStonePots = [...(game[0].stonePots as StonePot[])];
    let newLastMoveX: number | null = game[0].lastMoveX;
    let newLastMoveY: number | null = game[0].lastMoveY;
    let newKoPointX: number | null = null;
    let newKoPointY: number | null = null;
    const currentKoPointX = game[0].koPointX;
    const currentKoPointY = game[0].koPointY;
    let currentTurn = game[0].currentTurn;

    switch (actionType) {
      case 'place': {
        if (typeof stoneColor !== 'number' || stoneColor < 0 || stoneColor >= playerCount) {
          const err = await errorResponse(ERROR_IDS.WILDE_INVALID_STONE_COLOR, 'Invalid stone color', 400);
          if (err) return err;
          return NextResponse.json({}, { status: 400 });
        }
        // Enforce turn order
        if (stoneColor !== currentTurn) {
          const err = await errorResponse(ERROR_IDS.WILDE_INVALID_MOVE, 'Invalid move', 400);
          if (err) return err;
          return NextResponse.json({}, { status: 400 });
        }
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          const err = await errorResponse(ERROR_IDS.WILDE_INVALID_POSITION, 'Invalid position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (!isValidPosition(toX, toY, width, height)) {
          const err = await errorResponse(ERROR_IDS.WILDE_POSITION_OUT_OF_BOUNDS, 'Position out of bounds', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }
        if (newBoardState[toY][toX] !== null) {
          const err = await errorResponse(ERROR_IDS.WILDE_POSITION_OCCUPIED, 'Position is occupied', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Position is occupied' }, { status: 400 });
        }

        // Check suicide
        if (wouldBeSuicide(newBoardState, toX, toY, stoneColor, width, height)) {
          const err = await errorResponse(ERROR_IDS.WILDE_SUICIDE_NOT_ALLOWED, 'Suicide move not allowed', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Suicide move not allowed' }, { status: 400 });
        }

        // Check Ko
        if (currentKoPointX !== null && currentKoPointY !== null && toX === currentKoPointX && toY === currentKoPointY) {
          const err = await errorResponse(ERROR_IDS.WILDE_KO_VIOLATION, 'Ko rule violation', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Ko rule violation' }, { status: 400 });
        }

        // Place stone
        newBoardState[toY][toX] = stoneColor;
        newStonePots[stoneColor] = {
          ...newStonePots[stoneColor],
          potCount: newStonePots[stoneColor].potCount - 1,
          onBoard: newStonePots[stoneColor].onBoard + 1
        };
        newLastMoveX = toX;
        newLastMoveY = toY;
        currentTurn = (currentTurn + 1) % playerCount;
        break;
      }

      case 'remove': {
        if (typeof fromX !== 'number' || typeof fromY !== 'number') {
          const err = await errorResponse(ERROR_IDS.WILDE_INVALID_POSITION, 'Invalid position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (!isValidPosition(fromX, fromY, width, height)) {
          const err = await errorResponse(ERROR_IDS.WILDE_POSITION_OUT_OF_BOUNDS, 'Position out of bounds', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }

        const removedStone = newBoardState[fromY][fromX];
        if (removedStone === null) {
          const err = await errorResponse(ERROR_IDS.WILDE_NO_STONE_AT_POSITION, 'No stone at position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'No stone at position' }, { status: 400 });
        }

        newBoardState[fromY][fromX] = null;
        newStonePots[removedStone] = {
          ...newStonePots[removedStone],
          potCount: newStonePots[removedStone].potCount + 1,
          onBoard: newStonePots[removedStone].onBoard - 1
        };

        // Use SQL increment for atomic moveNumber
        const updateResult = await db.update(wildeGames).set({
          boardState: newBoardState as WildeBoard,
          stonePots: newStonePots,
          moveNumber: sql`${wildeGames.moveNumber} + 1`,
          updatedAt: new Date(),
        }).where(eq(wildeGames.id, gameId)).returning({ moveNumber: wildeGames.moveNumber });

        const newMoveNumber = updateResult[0]?.moveNumber ?? game[0].moveNumber + 1;

        await db.insert(wildeActions).values({
          id: randomUUID(),
          gameId,
          actionType: 'remove',
          stoneColor: removedStone,
          fromX,
          fromY,
          toX: null,
          toY: null,
          moveNumber: newMoveNumber,
        });

        return NextResponse.json({
          success: true,
          boardState: newBoardState,
          stonePots: newStonePots,
          lastMoveX: newLastMoveX,
          lastMoveY: newLastMoveY,
          koPointX: newKoPointX,
          koPointY: newKoPointY,
          currentTurn: currentTurn,
          moveNumber: newMoveNumber,
        });
      }

      case 'pacman_eat': {
        // Pacman eats a stone - returns it to owner's pot (no turn restrictions)
        // Server-side validation: check pacman mode is enabled
        if (!game[0].pacmanMode) {
          return NextResponse.json({ error: 'Pacman mode is not enabled' }, { status: 400 });
        }

        if (typeof fromX !== 'number' || typeof fromY !== 'number') {
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (!isValidPosition(fromX, fromY, width, height)) {
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }

        const eatenStone = newBoardState[fromY][fromX];
        if (eatenStone === null) {
          // Stone already eaten, just return success
          return NextResponse.json({
            success: true,
            boardState: newBoardState,
            stonePots: newStonePots,
            lastMoveX: newLastMoveX,
            lastMoveY: newLastMoveY,
            koPointX: newKoPointX,
            koPointY: newKoPointY,
            currentTurn: currentTurn,
            moveNumber: game[0].moveNumber,
          });
        }

        newBoardState[fromY][fromX] = null;
        newStonePots[eatenStone] = {
          ...newStonePots[eatenStone],
          potCount: newStonePots[eatenStone].potCount + 1,
          onBoard: newStonePots[eatenStone].onBoard - 1
        };

        // Use SQL increment for atomic moveNumber
        const updateResult = await db.update(wildeGames).set({
          boardState: newBoardState as WildeBoard,
          stonePots: newStonePots,
          moveNumber: sql`${wildeGames.moveNumber} + 1`,
          updatedAt: new Date(),
        }).where(eq(wildeGames.id, gameId)).returning({ moveNumber: wildeGames.moveNumber });

        const newMoveNumber = updateResult[0]?.moveNumber ?? game[0].moveNumber + 1;

        await db.insert(wildeActions).values({
          id: randomUUID(),
          gameId,
          actionType: 'pacman_eat',
          stoneColor: eatenStone,
          fromX,
          fromY,
          toX: null,
          toY: null,
          moveNumber: newMoveNumber,
        });

        return NextResponse.json({
          success: true,
          boardState: newBoardState,
          stonePots: newStonePots,
          lastMoveX: newLastMoveX,
          lastMoveY: newLastMoveY,
          koPointX: newKoPointX,
          koPointY: newKoPointY,
          currentTurn: currentTurn,
          moveNumber: newMoveNumber,
        });
      }

      case 'move': {
        if (typeof fromX !== 'number' || typeof fromY !== 'number') {
          const err = await errorResponse(ERROR_IDS.WILDE_INVALID_FROM_POSITION, 'Invalid from position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Invalid from position' }, { status: 400 });
        }
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          const err = await errorResponse(ERROR_IDS.WILDE_INVALID_TO_POSITION, 'Invalid to position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Invalid to position' }, { status: 400 });
        }
        if (!isValidPosition(fromX, fromY, width, height)) {
          const err = await errorResponse(ERROR_IDS.WILDE_FROM_OUT_OF_BOUNDS, 'From position out of bounds', 400);
          if (err) return err;
          return NextResponse.json({ error: 'From position out of bounds' }, { status: 400 });
        }
        if (!isValidPosition(toX, toY, width, height)) {
          const err = await errorResponse(ERROR_IDS.WILDE_TO_OUT_OF_BOUNDS, 'To position out of bounds', 400);
          if (err) return err;
          return NextResponse.json({ error: 'To position out of bounds' }, { status: 400 });
        }
        if (fromX === toX && fromY === toY) {
          const err = await errorResponse(ERROR_IDS.WILDE_SAME_POSITION, 'Cannot move to same position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Cannot move to same position' }, { status: 400 });
        }

        const movedStone = newBoardState[fromY][fromX];
        if (movedStone === null) {
          const err = await errorResponse(ERROR_IDS.WILDE_NO_STONE_FROM, 'No stone at from position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'No stone at from position' }, { status: 400 });
        }
        if (newBoardState[toY][toX] !== null) {
          const err = await errorResponse(ERROR_IDS.WILDE_TO_OCCUPIED, 'To position is occupied', 400);
          if (err) return err;
          return NextResponse.json({ error: 'To position is occupied' }, { status: 400 });
        }

        const testBoard = newBoardState.map(row => [...row]) as GenericBoard;
        testBoard[fromY][fromX] = null;
        if (wouldBeSuicide(testBoard, toX, toY, movedStone, width, height)) {
          const err = await errorResponse(ERROR_IDS.WILDE_SUICIDE_NOT_ALLOWED, 'Suicide move not allowed', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Suicide move not allowed' }, { status: 400 });
        }

        newBoardState[fromY][fromX] = null;
        newBoardState[toY][toX] = movedStone;

        // Check for captures
        const captureResult = detectAndRemoveCaptures(newBoardState, width, height, toX, toY);
        newBoardState = captureResult.newBoard;

        let totalCaptured = 0;
        captureResult.capturedByColor.forEach((count, capturedColor) => {
          if (count > 0) {
            totalCaptured += count;
            newStonePots[capturedColor] = {
              ...newStonePots[capturedColor],
              onBoard: newStonePots[capturedColor].onBoard - count
            };
          }
        });

        if (totalCaptured > 0) {
          newStonePots[movedStone] = {
            ...newStonePots[movedStone],
            captured: newStonePots[movedStone].captured + totalCaptured
          };
        }

        if (captureResult.koPoint) {
          newKoPointX = captureResult.koPoint.x;
          newKoPointY = captureResult.koPoint.y;
        }
        newLastMoveX = toX;
        newLastMoveY = toY;

        // Use SQL increment for atomic moveNumber
        const updateResult = await db.update(wildeGames).set({
          boardState: newBoardState as WildeBoard,
          stonePots: newStonePots,
          lastMoveX: newLastMoveX,
          lastMoveY: newLastMoveY,
          koPointX: newKoPointX,
          koPointY: newKoPointY,
          moveNumber: sql`${wildeGames.moveNumber} + 1`,
          updatedAt: new Date(),
        }).where(eq(wildeGames.id, gameId)).returning({ moveNumber: wildeGames.moveNumber });

        const newMoveNumber = updateResult[0]?.moveNumber ?? game[0].moveNumber + 1;

        await db.insert(wildeActions).values({
          id: randomUUID(),
          gameId,
          actionType: 'move',
          stoneColor: movedStone,
          fromX,
          fromY,
          toX,
          toY,
          moveNumber: newMoveNumber,
        });

        return NextResponse.json({
          success: true,
          boardState: newBoardState,
          stonePots: newStonePots,
          lastMoveX: newLastMoveX,
          lastMoveY: newLastMoveY,
          koPointX: newKoPointX,
          koPointY: newKoPointY,
          currentTurn: currentTurn,
          moveNumber: newMoveNumber,
        });
      }

      default: {
        const err = await errorResponse(ERROR_IDS.WILDE_INVALID_ACTION, 'Invalid action type', 400);
        if (err) return err;
        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
      }
    }

    // Check for captures after place
    if (actionType === 'place') {
      const placedX = toX as number;
      const placedY = toY as number;
      const placedStone = newBoardState[placedY][placedX];
      const captureResult = detectAndRemoveCaptures(newBoardState, width, height, placedX, placedY);
      newBoardState = captureResult.newBoard;

      let totalCaptured = 0;
      captureResult.capturedByColor.forEach((count, capturedColor) => {
        if (count > 0) {
          totalCaptured += count;
          newStonePots[capturedColor] = {
            ...newStonePots[capturedColor],
            onBoard: newStonePots[capturedColor].onBoard - count
          };
        }
      });

      if (totalCaptured > 0 && placedStone !== null) {
        newStonePots[placedStone] = {
          ...newStonePots[placedStone],
          captured: newStonePots[placedStone].captured + totalCaptured
        };
      }

      if (captureResult.koPoint) {
        newKoPointX = captureResult.koPoint.x;
        newKoPointY = captureResult.koPoint.y;
      }
    }

    // Use SQL increment for atomic moveNumber
    const updateResult = await db.update(wildeGames).set({
      boardState: newBoardState as WildeBoard,
      stonePots: newStonePots,
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
      currentTurn: currentTurn,
      moveNumber: sql`${wildeGames.moveNumber} + 1`,
      updatedAt: new Date(),
    }).where(eq(wildeGames.id, gameId)).returning({ moveNumber: wildeGames.moveNumber });

    const newMoveNumber = updateResult[0]?.moveNumber ?? game[0].moveNumber + 1;

    await db.insert(wildeActions).values({
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
      stonePots: newStonePots,
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
