import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wildeGames, wildeActions, StonePot } from '@/lib/db/schema';
import { eq, desc, and, asc } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import {
  createEmptyBoard,
  detectAndRemoveCaptures,
  type GenericBoard,
} from '@/lib/game/shared';
import { errorResponse, ERROR_IDS } from '@/lib/errors';

type WildeStone = number | null;
type WildeBoard = WildeStone[][];

// POST /api/wilde/[gameId]/undo - Undo the last move
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { privateKey } = body;

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

    // Get all actions for this game, ordered by moveNumber
    const allActions = await db
      .select()
      .from(wildeActions)
      .where(eq(wildeActions.gameId, gameId))
      .orderBy(asc(wildeActions.moveNumber));

    // Find the last action that isn't pakita_eat (those are auto-generated)
    const lastPlayerActionIndex = [...allActions].reverse().findIndex(a => a.actionType !== 'pakita_eat');

    if (lastPlayerActionIndex === -1 || allActions.length === 0) {
      const err = await errorResponse(ERROR_IDS.WILDE_NO_MOVES_UNDO, 'No moves to undo', 400);
      if (err) return err;
      return NextResponse.json({ error: 'No moves to undo' }, { status: 400 });
    }

    // Calculate actual index from the end
    const actualIndex = allActions.length - 1 - lastPlayerActionIndex;
    const lastAction = allActions[actualIndex];

    // Get all actions before the one we're undoing (including any pakita_eat after the last player action)
    const actionsToReplay = allActions.slice(0, actualIndex);
    // Actions to delete: the player action and any pakita_eat actions after it
    const actionsToDelete = allActions.slice(actualIndex);

    // Replay all actions to reconstruct the board
    const width = game[0].boardWidth;
    const height = game[0].boardHeight;
    const playerCount = game[0].playerCount;
    let newBoardState: GenericBoard = createEmptyBoard(width, height);

    // Initialize stone pots - calculate starting values
    const totalIntersections = width * height;
    const stonesPerPlayer = Math.floor(totalIntersections / playerCount);
    const extraStones = totalIntersections % playerCount;

    let newStonePots: StonePot[] = [];
    for (let i = 0; i < playerCount; i++) {
      newStonePots.push({
        potCount: stonesPerPlayer + (i < extraStones ? 1 : 0),
        captured: 0,
        onBoard: 0,
      });
    }

    let lastMoveX: number | null = null;
    let lastMoveY: number | null = null;
    let koPointX: number | null = null;
    let koPointY: number | null = null;
    let currentTurn = 0;
    let moveNumber = 0;

    // Replay each action
    for (const action of actionsToReplay) {
      // Reset Ko point before each action (it only persists from the previous move)
      koPointX = null;
      koPointY = null;

      switch (action.actionType) {
        case 'place': {
          const x = action.toX;
          const y = action.toY;
          const stoneColor = action.stoneColor;

          // Type safety: validate values exist
          if (x === null || y === null || stoneColor === null || stoneColor < 0 || stoneColor >= playerCount) {
            continue;
          }

          newBoardState[y][x] = stoneColor;
          newStonePots[stoneColor] = {
            ...newStonePots[stoneColor],
            potCount: newStonePots[stoneColor].potCount - 1,
            onBoard: newStonePots[stoneColor].onBoard + 1,
          };

          lastMoveX = x;
          lastMoveY = y;
          currentTurn = (currentTurn + 1) % playerCount;

          // Apply captures
          const captureResult = detectAndRemoveCaptures(newBoardState, width, height, x, y);
          newBoardState = captureResult.newBoard;

          // Update captured counts - add to capturer's score
          let totalCaptured = 0;
          captureResult.capturedByColor.forEach((count, capturedColor) => {
            if (count > 0) {
              totalCaptured += count;
              // Decrement onBoard for captured player
              newStonePots[capturedColor] = {
                ...newStonePots[capturedColor],
                onBoard: newStonePots[capturedColor].onBoard - count,
              };
            }
          });

          if (totalCaptured > 0) {
            // Add to capturer's captured count
            newStonePots[stoneColor] = {
              ...newStonePots[stoneColor],
              captured: newStonePots[stoneColor].captured + totalCaptured,
            };
          }

          // Track Ko point
          if (captureResult.koPoint) {
            koPointX = captureResult.koPoint.x;
            koPointY = captureResult.koPoint.y;
          }
          break;
        }

        case 'remove': {
          const x = action.fromX;
          const y = action.fromY;
          const stoneColor = action.stoneColor;

          if (x === null || y === null || stoneColor === null || stoneColor < 0 || stoneColor >= playerCount) {
            continue;
          }

          newBoardState[y][x] = null;
          newStonePots[stoneColor] = {
            ...newStonePots[stoneColor],
            potCount: newStonePots[stoneColor].potCount + 1,
            onBoard: newStonePots[stoneColor].onBoard - 1,
          };
          break;
        }

        case 'move': {
          const fromX = action.fromX;
          const fromY = action.fromY;
          const toX = action.toX;
          const toY = action.toY;
          const stoneColor = action.stoneColor;

          if (fromX === null || fromY === null || toX === null || toY === null) {
            continue;
          }

          const stone = newBoardState[fromY][fromX];
          newBoardState[fromY][fromX] = null;
          newBoardState[toY][toX] = stone;

          lastMoveX = toX;
          lastMoveY = toY;

          // Apply captures after move
          const captureResult = detectAndRemoveCaptures(newBoardState, width, height, toX, toY);
          newBoardState = captureResult.newBoard;

          // Update captured counts
          let totalCaptured = 0;
          captureResult.capturedByColor.forEach((count, capturedColor) => {
            if (count > 0) {
              totalCaptured += count;
              newStonePots[capturedColor] = {
                ...newStonePots[capturedColor],
                onBoard: newStonePots[capturedColor].onBoard - count,
              };
            }
          });

          if (totalCaptured > 0 && stone !== null) {
            newStonePots[stone] = {
              ...newStonePots[stone],
              captured: newStonePots[stone].captured + totalCaptured,
            };
          }

          // Track Ko point
          if (captureResult.koPoint) {
            koPointX = captureResult.koPoint.x;
            koPointY = captureResult.koPoint.y;
          }
          break;
        }

        case 'pakita_eat': {
          const x = action.fromX;
          const y = action.fromY;
          const stoneColor = action.stoneColor;

          if (x === null || y === null || stoneColor === null || stoneColor < 0 || stoneColor >= playerCount) {
            continue;
          }

          // Pakita eating returns stone to owner's pot (no capture scoring)
          if (newBoardState[y][x] !== null) {
            const eatenStone = newBoardState[y][x] as number;
            newBoardState[y][x] = null;
            newStonePots[eatenStone] = {
              ...newStonePots[eatenStone],
              potCount: newStonePots[eatenStone].potCount + 1,
              onBoard: newStonePots[eatenStone].onBoard - 1,
            };
          }
          break;
        }
      }
      moveNumber = action.moveNumber;
    }

    // Delete all actions from the undone action onward (including pakita_eat actions)
    for (const actionToDelete of actionsToDelete) {
      await db.delete(wildeActions).where(
        and(
          eq(wildeActions.gameId, gameId),
          eq(wildeActions.id, actionToDelete.id)
        )
      );
    }

    // Recalculate moveNumber based on replayed actions
    const newMoveNumber = actionsToReplay.length > 0
      ? actionsToReplay[actionsToReplay.length - 1].moveNumber
      : 0;

    // Update the game with properly restored state
    await db.update(wildeGames).set({
      boardState: newBoardState as WildeBoard,
      stonePots: newStonePots,
      currentTurn: currentTurn,
      moveNumber: newMoveNumber,
      lastMoveX: lastMoveX,
      lastMoveY: lastMoveY,
      koPointX: koPointX, // Now properly restored!
      koPointY: koPointY,
      updatedAt: new Date(),
    }).where(eq(wildeGames.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: newBoardState,
      stonePots: newStonePots,
      currentTurn: currentTurn,
      moveNumber: newMoveNumber,
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
