import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, actions, CapturedStoneInfo } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import type { Board, Stone } from '@/lib/game/logic';
import {
  createEmptySquareBoard,
  detectAndRemoveCaptures,
  type GenericBoard,
  type Position,
} from '@/lib/game/shared';
import { errorResponse, ERROR_IDS } from '@/lib/errors';

// POST /api/games/[gameId]/undo - Undo the last move
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { privateKey } = body;

    if (!privateKey) {
      const err = await errorResponse(ERROR_IDS.NORMAL_PRIVATE_KEY_REQUIRED, 'Private key is required', 400);
      if (err) return err;
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    const game = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (game.length === 0) {
      const err = await errorResponse(ERROR_IDS.NORMAL_GAME_NOT_FOUND, 'Game not found', 404);
      if (err) return err;
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      const err = await errorResponse(ERROR_IDS.NORMAL_INVALID_PRIVATE_KEY, 'Invalid private key', 401);
      if (err) return err;
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    // Get all actions for this game
    const allActions = await db
      .select()
      .from(actions)
      .where(eq(actions.gameId, gameId))
      .orderBy(asc(actions.createdAt));

    if (allActions.length === 0) {
      const err = await errorResponse(ERROR_IDS.NORMAL_NO_MOVES_UNDO, 'No moves to undo', 400);
      if (err) return err;
      return NextResponse.json({ error: 'No moves to undo' }, { status: 400 });
    }

    // Remove the last action
    const lastAction = allActions[allActions.length - 1];
    const actionsWithoutLast = allActions.slice(0, -1);

    // Replay all actions except the last one to reconstruct the board
    const boardSize = game[0].boardSize;
    let newBoardState: GenericBoard = createEmptySquareBoard(boardSize);

    // Get initial stone counts
    const getInitialStones = (size: number) => {
      if (size === 9) return { black: 41, white: 40 };
      if (size === 13) return { black: 85, white: 84 };
      return { black: 181, white: 180 };
    };
    const initialStones = getInitialStones(boardSize);

    let newBlackPotCount = initialStones.black;
    let newWhitePotCount = initialStones.white;
    let newBlackCaptured = 0;
    let newWhiteCaptured = 0;
    let newBlackOnBoard = 0;
    let newWhiteOnBoard = 0;
    let lastMoveX: number | null = null;
    let lastMoveY: number | null = null;
    let koPointX: number | null = null;
    let koPointY: number | null = null;

    // Replay each action
    for (const action of actionsWithoutLast) {
      // Reset Ko point before each action (it only persists from the previous move)
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
          if (stoneColor === 0) {
            newBlackPotCount--;
            newBlackOnBoard++;
          } else if (stoneColor === 1) {
            newWhitePotCount--;
            newWhiteOnBoard++;
          }
          lastMoveX = x;
          lastMoveY = y;

          // Apply captures
          const captureResult = detectAndRemoveCaptures(newBoardState, boardSize, boardSize, x, y);
          newBoardState = captureResult.newBoard;

          // Update captures - capturedByColor contains count of each player's stones captured
          const blackCaptured = captureResult.capturedByColor.get(0) || 0;
          const whiteCaptured = captureResult.capturedByColor.get(1) || 0;

          if (blackCaptured > 0) {
            newWhiteCaptured += blackCaptured; // White captured black stones
            newBlackOnBoard -= blackCaptured;
          }
          if (whiteCaptured > 0) {
            newBlackCaptured += whiteCaptured; // Black captured white stones
            newWhiteOnBoard -= whiteCaptured;
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

          if (stone === 0) {
            newBlackPotCount++;
            newBlackOnBoard--;
          } else if (stone === 1) {
            newWhitePotCount++;
            newWhiteOnBoard--;
          }
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

          const blackCaptured = captureResult.capturedByColor.get(0) || 0;
          const whiteCaptured = captureResult.capturedByColor.get(1) || 0;

          if (blackCaptured > 0) {
            newWhiteCaptured += blackCaptured;
            newBlackOnBoard -= blackCaptured;
          }
          if (whiteCaptured > 0) {
            newBlackCaptured += whiteCaptured;
            newWhiteOnBoard -= whiteCaptured;
          }

          // Track Ko point from this action
          if (captureResult.koPoint) {
            koPointX = captureResult.koPoint.x;
            koPointY = captureResult.koPoint.y;
          }
          break;
        }
      }
    }

    // Delete the last action
    await db.delete(actions).where(
      and(
        eq(actions.gameId, gameId),
        eq(actions.id, lastAction.id)
      )
    );

    // Update the game with properly restored Ko point
    await db.update(games).set({
      boardState: newBoardState as Board,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      blackCaptured: newBlackCaptured,
      whiteCaptured: newWhiteCaptured,
      blackOnBoard: newBlackOnBoard,
      whiteOnBoard: newWhiteOnBoard,
      lastMoveX: lastMoveX,
      lastMoveY: lastMoveY,
      koPointX: koPointX, // Now properly restored!
      koPointY: koPointY,
      updatedAt: new Date(),
    }).where(eq(games.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: newBoardState,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      blackCaptured: newBlackCaptured,
      whiteCaptured: newWhiteCaptured,
      blackOnBoard: newBlackOnBoard,
      whiteOnBoard: newWhiteOnBoard,
      lastMoveX: lastMoveX,
      lastMoveY: lastMoveY,
      koPointX: koPointX,
      koPointY: koPointY,
    });
  } catch (error) {
    console.error('Error undoing action:', error);
    return NextResponse.json({ error: 'Failed to undo' }, { status: 500 });
  }
}
