import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { zenGames, zenActions } from '@/lib/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import {
  createEmptySquareBoard,
  detectAndRemoveCaptures,
  type GenericBoard,
} from '@/lib/game/shared';
import { errorResponse, ERROR_IDS } from '@/lib/errors';

type ZenStone = 0 | 1 | null;
type ZenBoard = ZenStone[][];

// Calculate initial pot count: boardSize * boardSize + 1
function getInitialPotCount(boardSize: number): number {
  return boardSize * boardSize + 1;
}

// POST /api/zen/[gameId]/undo - Undo the last move
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { privateKey } = body;

    if (!privateKey) {
      const err = await errorResponse(ERROR_IDS.ZEN_PRIVATE_KEY_REQUIRED, 'Private key is required', 400);
      if (err) return err;
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    const game = await db
      .select()
      .from(zenGames)
      .where(eq(zenGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      const err = await errorResponse(ERROR_IDS.ZEN_GAME_NOT_FOUND, 'Game not found', 404);
      if (err) return err;
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      const err = await errorResponse(ERROR_IDS.ZEN_INVALID_PRIVATE_KEY, 'Invalid private key', 401);
      if (err) return err;
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    // Get all actions for this game
    const allActions = await db
      .select()
      .from(zenActions)
      .where(eq(zenActions.gameId, gameId))
      .orderBy(asc(zenActions.moveNumber));

    if (allActions.length === 0) {
      const err = await errorResponse(ERROR_IDS.ZEN_NO_MOVES_UNDO, 'No moves to undo', 400);
      if (err) return err;
      return NextResponse.json({ error: 'No moves to undo' }, { status: 400 });
    }

    // Remove the last action
    const lastAction = allActions[allActions.length - 1];
    const actionsWithoutLast = allActions.slice(0, -1);

    // Replay all actions except the last one to reconstruct the board
    const boardSize = game[0].boardSize;
    let newBoardState: GenericBoard = createEmptySquareBoard(boardSize);
    const initialPotCount = getInitialPotCount(boardSize);

    let newSharedPotCount = initialPotCount;
    let newNextStoneColor = 0; // Start with black
    let newPlayer1Captured = 0;
    let newPlayer2Captured = 0;
    let newPlayer3Captured = 0;
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

          if (x === null || y === null || stoneColor === null) {
            continue;
          }

          newBoardState[y][x] = stoneColor;
          newSharedPotCount--;

          lastMoveX = x;
          lastMoveY = y;
          currentTurn = (currentTurn + 1) % 3;
          newNextStoneColor = 1 - newNextStoneColor;

          // Apply captures
          const captureResult = detectAndRemoveCaptures(newBoardState, boardSize, boardSize, x, y);
          newBoardState = captureResult.newBoard;

          let totalCaptured = 0;
          captureResult.capturedByColor.forEach((count) => {
            totalCaptured += count;
          });

          // Credit captures to the player who just played (now currentTurn - 1)
          if (totalCaptured > 0) {
            const capturingPlayer = (currentTurn + 2) % 3;
            if (capturingPlayer === 0) newPlayer1Captured += totalCaptured;
            else if (capturingPlayer === 1) newPlayer2Captured += totalCaptured;
            else if (capturingPlayer === 2) newPlayer3Captured += totalCaptured;
          }

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

          newBoardState[y][x] = null;
          newSharedPotCount++;
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

          // For move actions, we don't credit to any specific player (it's a board manipulation)

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
    await db.delete(zenActions).where(
      and(
        eq(zenActions.gameId, gameId),
        eq(zenActions.id, lastAction.id)
      )
    );

    // Update the game with properly restored state
    await db.update(zenGames).set({
      boardState: newBoardState as ZenBoard,
      sharedPotCount: newSharedPotCount,
      nextStoneColor: newNextStoneColor,
      player1Captured: newPlayer1Captured,
      player2Captured: newPlayer2Captured,
      player3Captured: newPlayer3Captured,
      lastMoveX: lastMoveX,
      lastMoveY: lastMoveY,
      koPointX: koPointX,
      koPointY: koPointY,
      currentTurn: currentTurn,
      moveNumber: moveNumber,
      updatedAt: new Date(),
    }).where(eq(zenGames.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: newBoardState,
      sharedPotCount: newSharedPotCount,
      nextStoneColor: newNextStoneColor,
      player1Captured: newPlayer1Captured,
      player2Captured: newPlayer2Captured,
      player3Captured: newPlayer3Captured,
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
