import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crazyGames, crazyActions } from '@/lib/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import {
  createEmptySquareBoard,
  detectAndRemoveCaptures,
  type GenericBoard,
} from '@/lib/game/shared';
import { errorResponse, ERROR_IDS } from '@/lib/errors';

type CrazyStone = 0 | 1 | 2 | 3 | null;
type CrazyBoard = CrazyStone[][];

// POST /api/crazy/[gameId]/undo - Undo the last move
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { privateKey } = body;

    if (!privateKey) {
      const err = await errorResponse(ERROR_IDS.CRAZY_PRIVATE_KEY_REQUIRED, 'Private key is required', 400);
      if (err) return err;
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    const game = await db
      .select()
      .from(crazyGames)
      .where(eq(crazyGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      const err = await errorResponse(ERROR_IDS.CRAZY_GAME_NOT_FOUND, 'Game not found', 404);
      if (err) return err;
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      const err = await errorResponse(ERROR_IDS.CRAZY_INVALID_PRIVATE_KEY, 'Invalid private key', 401);
      if (err) return err;
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    // Get all actions for this game
    const allActions = await db
      .select()
      .from(crazyActions)
      .where(eq(crazyActions.gameId, gameId))
      .orderBy(asc(crazyActions.moveNumber));

    if (allActions.length === 0) {
      const err = await errorResponse(ERROR_IDS.CRAZY_NO_MOVES_UNDO, 'No moves to undo', 400);
      if (err) return err;
      return NextResponse.json({ error: 'No moves to undo' }, { status: 400 });
    }

    // Remove the last action
    const lastAction = allActions[allActions.length - 1];
    const actionsWithoutLast = allActions.slice(0, -1);

    // Replay all actions except the last one to reconstruct the board
    const boardSize = game[0].boardSize;
    let newBoardState: GenericBoard = createEmptySquareBoard(boardSize);

    // Calculate initial pot counts based on board size
    const getCrazyStones = (size: number) => {
      if (size === 9) return { black: 21, white: 20, brown: 20, grey: 20 };
      if (size === 13) return { black: 43, white: 42, brown: 42, grey: 42 };
      return { black: 91, white: 90, brown: 90, grey: 90 };
    };
    const stones = getCrazyStones(boardSize);

    let newBlackPotCount = stones.black;
    let newWhitePotCount = stones.white;
    let newBrownPotCount = stones.brown;
    let newGreyPotCount = stones.grey;
    let newBlackCaptured = 0;
    let newWhiteCaptured = 0;
    let newBrownCaptured = 0;
    let newGreyCaptured = 0;
    let lastMoveX: number | null = null;
    let lastMoveY: number | null = null;
    let koPointX: number | null = null;
    let koPointY: number | null = null;
    let currentTurn = 0;
    let moveNumber = 0;

    // Replay each action
    for (const action of actionsWithoutLast) {
      // Reset Ko point before each action
      koPointX = null;
      koPointY = null;

      switch (action.actionType) {
        case 'place': {
          const x = action.toX;
          const y = action.toY;
          const stoneColor = action.stoneColor;

          // Type safety: validate values exist
          if (x === null || y === null || stoneColor === null) {
            continue;
          }

          newBoardState[y][x] = stoneColor;
          if (stoneColor === 0) newBlackPotCount--;
          else if (stoneColor === 1) newWhitePotCount--;
          else if (stoneColor === 2) newBrownPotCount--;
          else if (stoneColor === 3) newGreyPotCount--;

          lastMoveX = x;
          lastMoveY = y;
          currentTurn = (currentTurn + 1) % 4;

          // Apply captures - Japanese scoring: capturing player gets credit
          const captureResult = detectAndRemoveCaptures(newBoardState, boardSize, boardSize, x, y);
          newBoardState = captureResult.newBoard;

          // Sum up total captured and credit to placing player
          let totalCaptured = 0;
          captureResult.capturedByColor.forEach((count) => {
            totalCaptured += count;
          });

          if (totalCaptured > 0) {
            if (stoneColor === 0) newBlackCaptured += totalCaptured;
            else if (stoneColor === 1) newWhiteCaptured += totalCaptured;
            else if (stoneColor === 2) newBrownCaptured += totalCaptured;
            else if (stoneColor === 3) newGreyCaptured += totalCaptured;
          }

          // Track Ko point from this action
          if (captureResult.koPoint) {
            koPointX = captureResult.koPoint.x;
            koPointY = captureResult.koPoint.y;
          }
          break;
        }

        case 'remove': {
          const x = action.fromX;
          const y = action.fromY;

          if (x === null || y === null) {
            continue;
          }

          const stone = newBoardState[y][x];
          newBoardState[y][x] = null;

          if (stone === 0) newBlackPotCount++;
          else if (stone === 1) newWhitePotCount++;
          else if (stone === 2) newBrownPotCount++;
          else if (stone === 3) newGreyPotCount++;
          break;
        }

        case 'move': {
          const fromX = action.fromX;
          const fromY = action.fromY;
          const toX = action.toX;
          const toY = action.toY;

          if (fromX === null || fromY === null || toX === null || toY === null) {
            continue;
          }

          const stone = newBoardState[fromY][fromX];
          newBoardState[fromY][fromX] = null;
          newBoardState[toY][toX] = stone;

          // Apply captures after move
          const captureResult = detectAndRemoveCaptures(newBoardState, boardSize, boardSize, toX, toY);
          newBoardState = captureResult.newBoard;

          let totalCaptured = 0;
          captureResult.capturedByColor.forEach((count) => {
            totalCaptured += count;
          });

          if (totalCaptured > 0 && stone !== null) {
            if (stone === 0) newBlackCaptured += totalCaptured;
            else if (stone === 1) newWhiteCaptured += totalCaptured;
            else if (stone === 2) newBrownCaptured += totalCaptured;
            else if (stone === 3) newGreyCaptured += totalCaptured;
          }

          // Track Ko point from this action
          if (captureResult.koPoint) {
            koPointX = captureResult.koPoint.x;
            koPointY = captureResult.koPoint.y;
          }
          break;
        }
      }
      moveNumber++;
    }

    // Delete the last action
    await db.delete(crazyActions).where(
      and(
        eq(crazyActions.gameId, gameId),
        eq(crazyActions.id, lastAction.id)
      )
    );

    // Update the game with properly restored Ko point
    await db.update(crazyGames).set({
      boardState: newBoardState as CrazyBoard,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      brownPotCount: newBrownPotCount,
      greyPotCount: newGreyPotCount,
      blackCaptured: newBlackCaptured,
      whiteCaptured: newWhiteCaptured,
      brownCaptured: newBrownCaptured,
      greyCaptured: newGreyCaptured,
      lastMoveX: lastMoveX,
      lastMoveY: lastMoveY,
      koPointX: koPointX, // Now properly restored!
      koPointY: koPointY,
      currentTurn: currentTurn,
      moveNumber: moveNumber,
      updatedAt: new Date(),
    }).where(eq(crazyGames.id, gameId));

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
      lastMoveX: lastMoveX,
      lastMoveY: lastMoveY,
      koPointX: koPointX,
      koPointY: koPointY,
      currentTurn: currentTurn,
      moveNumber: moveNumber,
    });
  } catch (error) {
    console.error('Error undoing action:', error);
    return NextResponse.json({ error: 'Failed to undo' }, { status: 500 });
  }
}
