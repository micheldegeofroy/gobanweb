import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bangGames, bangActions } from '@/lib/db/schema';
import type { MinePosition, ExplosionInfo, DroneStrikeInfo } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import type { Board, Stone } from '@/lib/game/logic';
import { detectAndRemoveCaptures } from '@/lib/game/logic';

// POST /api/bang/[gameId]/undo - Undo the last move
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { privateKey } = body;

    if (!privateKey) {
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    const game = await db
      .select()
      .from(bangGames)
      .where(eq(bangGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    // Get all actions for this game
    const allActions = await db
      .select()
      .from(bangActions)
      .where(eq(bangActions.gameId, gameId))
      .orderBy(asc(bangActions.createdAt));

    if (allActions.length === 0) {
      return NextResponse.json({ error: 'No moves to undo' }, { status: 400 });
    }

    // Remove the last action
    const lastAction = allActions[allActions.length - 1];
    const actionsWithoutLast = allActions.slice(0, -1);

    // Replay all actions except the last one to reconstruct the board
    const boardSize = game[0].boardSize;
    const initialMines = game[0].minePositions as MinePosition[];

    // Create empty board
    let newBoardState: Board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));

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
    let newBlackExploded = 0;
    let newWhiteExploded = 0;
    let newBlackDroned = 0;
    let newWhiteDroned = 0;
    let lastMoveX: number | null = null;
    let lastMoveY: number | null = null;
    let lastExplosionX: number | null = null;
    let lastExplosionY: number | null = null;
    let lastDroneTargetX: number | null = null;
    let lastDroneTargetY: number | null = null;
    let koPointX: number | null = null;
    let koPointY: number | null = null;
    let currentTurn = 0; // Black starts
    let minePositions = [...initialMines];

    // Replay each action
    for (const action of actionsWithoutLast) {
      koPointX = null;
      koPointY = null;
      lastExplosionX = null;
      lastExplosionY = null;
      lastDroneTargetX = null;
      lastDroneTargetY = null;

      switch (action.actionType) {
        case 'place': {
          const x = action.toX;
          const y = action.toY;
          const stoneColor = action.stoneColor;

          if (x === null || y === null || stoneColor === null) continue;

          newBoardState[y][x] = stoneColor as Stone;
          if (stoneColor === 0) {
            newBlackPotCount--;
            newBlackOnBoard++;
          } else {
            newWhitePotCount--;
            newWhiteOnBoard++;
          }
          lastMoveX = x;
          lastMoveY = y;

          // Check for explosion
          const explosion = action.explosion as ExplosionInfo | null;
          if (explosion) {
            for (const target of explosion.destroyedStones) {
              newBoardState[target.y][target.x] = null;
              if (target.color === 0) {
                newBlackOnBoard--;
                newBlackExploded++;
              } else {
                newWhiteOnBoard--;
                newWhiteExploded++;
              }
            }
            // Remove exploded mine
            minePositions = minePositions.filter(m => !(m.x === x && m.y === y));
            lastExplosionX = x;
            lastExplosionY = y;
          } else {
            // Normal captures
            const captureResult = detectAndRemoveCaptures(newBoardState, x, y);
            newBoardState = captureResult.newBoard;

            if (captureResult.blackCaptured > 0) {
              newWhiteCaptured += captureResult.blackCaptured;
              newBlackOnBoard -= captureResult.blackCaptured;
            }
            if (captureResult.whiteCaptured > 0) {
              newBlackCaptured += captureResult.whiteCaptured;
              newWhiteOnBoard -= captureResult.whiteCaptured;
            }
            if (captureResult.koPoint) {
              koPointX = captureResult.koPoint.x;
              koPointY = captureResult.koPoint.y;
            }
          }

          // Drone strike
          const droneStrike = action.droneStrike as DroneStrikeInfo | null;
          if (droneStrike) {
            newBoardState[droneStrike.targetY][droneStrike.targetX] = null;
            if (droneStrike.targetColor === 0) {
              newBlackOnBoard--;
              newBlackDroned++;
            } else {
              newWhiteOnBoard--;
              newWhiteDroned++;
            }
            lastDroneTargetX = droneStrike.targetX;
            lastDroneTargetY = droneStrike.targetY;
          }

          // Switch turn
          currentTurn = currentTurn === 0 ? 1 : 0;
          break;
        }

        case 'remove': {
          const x = action.fromX;
          const y = action.fromY;

          if (x === null || y === null) continue;

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

          if (fromX === null || fromY === null || toX === null || toY === null) continue;

          const stone = newBoardState[fromY][fromX];
          newBoardState[fromY][fromX] = null;
          newBoardState[toY][toX] = stone;
          lastMoveX = toX;
          lastMoveY = toY;

          // Check for explosion
          const explosion = action.explosion as ExplosionInfo | null;
          if (explosion) {
            for (const target of explosion.destroyedStones) {
              newBoardState[target.y][target.x] = null;
              if (target.color === 0) {
                newBlackOnBoard--;
                newBlackExploded++;
              } else {
                newWhiteOnBoard--;
                newWhiteExploded++;
              }
            }
            minePositions = minePositions.filter(m => !(m.x === toX && m.y === toY));
            lastExplosionX = toX;
            lastExplosionY = toY;
          } else {
            const captureResult = detectAndRemoveCaptures(newBoardState, toX, toY);
            newBoardState = captureResult.newBoard;

            if (captureResult.blackCaptured > 0) {
              newWhiteCaptured += captureResult.blackCaptured;
              newBlackOnBoard -= captureResult.blackCaptured;
            }
            if (captureResult.whiteCaptured > 0) {
              newBlackCaptured += captureResult.whiteCaptured;
              newWhiteOnBoard -= captureResult.whiteCaptured;
            }
            if (captureResult.koPoint) {
              koPointX = captureResult.koPoint.x;
              koPointY = captureResult.koPoint.y;
            }
          }
          break;
        }
      }
    }

    // Delete the last action
    await db.delete(bangActions).where(eq(bangActions.id, lastAction.id));

    // Update the game
    await db.update(bangGames).set({
      boardState: newBoardState,
      minePositions: minePositions,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      blackCaptured: newBlackCaptured,
      whiteCaptured: newWhiteCaptured,
      blackOnBoard: newBlackOnBoard,
      whiteOnBoard: newWhiteOnBoard,
      blackExploded: newBlackExploded,
      whiteExploded: newWhiteExploded,
      blackDroned: newBlackDroned,
      whiteDroned: newWhiteDroned,
      lastMoveX,
      lastMoveY,
      lastExplosionX,
      lastExplosionY,
      lastDroneTargetX,
      lastDroneTargetY,
      koPointX,
      koPointY,
      currentTurn,
      moveNumber: actionsWithoutLast.length,
      updatedAt: new Date(),
    }).where(eq(bangGames.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: newBoardState,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      blackCaptured: newBlackCaptured,
      whiteCaptured: newWhiteCaptured,
      blackOnBoard: newBlackOnBoard,
      whiteOnBoard: newWhiteOnBoard,
      blackExploded: newBlackExploded,
      whiteExploded: newWhiteExploded,
      blackDroned: newBlackDroned,
      whiteDroned: newWhiteDroned,
      lastMoveX,
      lastMoveY,
      lastExplosionX,
      lastExplosionY,
      lastDroneTargetX,
      lastDroneTargetY,
      koPointX,
      koPointY,
      currentTurn,
    });
  } catch (error) {
    console.error('Error undoing action:', error);
    return NextResponse.json({ error: 'Failed to undo' }, { status: 500 });
  }
}
