import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bangGames, bangActions } from '@/lib/db/schema';
import type { MinePosition, ExplosionInfo, CapturedStoneInfo, DroneStrikeInfo } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import type { Board, Stone } from '@/lib/game/logic';
import { detectAndRemoveCaptures, wouldBeSuicide } from '@/lib/game/logic';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

// Drone strike chance (10% per move)
const DRONE_STRIKE_CHANCE = 0.10;

// Get a random stone position from the board (for drone targeting)
// targetColor: the color of stones to target (enemy drone targets current player's stones)
function getRandomStonePosition(board: Board, boardSize: number, targetColor: number): { x: number; y: number; color: number } | null {
  const stones: { x: number; y: number; color: number }[] = [];

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      if (board[y][x] === targetColor) {
        stones.push({ x, y, color: targetColor });
      }
    }
  }

  if (stones.length === 0) return null;
  return stones[Math.floor(Math.random() * stones.length)];
}

// Get drone start position (from edge of board)
function getDroneStartPosition(targetX: number, targetY: number, boardSize: number): { x: number; y: number } {
  // Drone comes from a random edge
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0: return { x: targetX, y: -1 }; // Top
    case 1: return { x: boardSize, y: targetY }; // Right
    case 2: return { x: targetX, y: boardSize }; // Bottom
    default: return { x: -1, y: targetY }; // Left
  }
}

// Check if a position has a mine
function hasMine(mines: MinePosition[], x: number, y: number): boolean {
  return mines.some(m => m.x === x && m.y === y);
}

// Get all stones in explosion radius (the placed stone + all adjacent stones)
function getExplosionTargets(board: Board, x: number, y: number, boardSize: number): CapturedStoneInfo[] {
  const targets: CapturedStoneInfo[] = [];
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1]
  ];

  // Include the trigger stone itself if it exists
  if (board[y][x] !== null) {
    targets.push({ x, y, color: board[y][x] as number });
  }

  // Include all adjacent stones
  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
      if (board[ny][nx] !== null) {
        targets.push({ x: nx, y: ny, color: board[ny][nx] as number });
      }
    }
  }

  return targets;
}

// POST /api/bang/[gameId]/action - Perform an action with mine detection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitKey = `bang:action:${gameId}:${clientIP}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.gameAction);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { privateKey, actionType, stoneColor, fromX, fromY, toX, toY } = body;

    if (!privateKey) {
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    // Get the game
    const game = await db
      .select()
      .from(bangGames)
      .where(eq(bangGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify the private key
    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    const boardState = game[0].boardState as Board;
    const boardSize = game[0].boardSize;
    const minePositions = game[0].minePositions as MinePosition[];
    let newMinePositions = [...minePositions]; // Mutable copy of mines
    let newBoardState = boardState.map(row => [...row]);
    let newBlackPotCount = game[0].blackPotCount;
    let newWhitePotCount = game[0].whitePotCount;
    let newBlackCaptured = game[0].blackCaptured;
    let newWhiteCaptured = game[0].whiteCaptured;
    let newBlackOnBoard = game[0].blackOnBoard;
    let newWhiteOnBoard = game[0].whiteOnBoard;
    let newBlackExploded = game[0].blackExploded;
    let newWhiteExploded = game[0].whiteExploded;
    let newLastMoveX: number | null = game[0].lastMoveX;
    let newLastMoveY: number | null = game[0].lastMoveY;
    let newLastExplosionX: number | null = null;
    let newLastExplosionY: number | null = null;
    let newKoPointX: number | null = null;
    let newKoPointY: number | null = null;
    let explosion: ExplosionInfo | null = null;
    let newCurrentTurn = game[0].currentTurn;
    const moveNumber = game[0].moveNumber + 1;

    switch (actionType) {
      case 'place': {
        if (typeof stoneColor !== 'number' || ![0, 1].includes(stoneColor)) {
          return NextResponse.json({ error: 'Invalid stone color' }, { status: 400 });
        }
        // Enforce turn order - must play your color
        if (stoneColor !== game[0].currentTurn) {
          return NextResponse.json({ error: `It's ${game[0].currentTurn === 0 ? 'Black' : 'White'}'s turn` }, { status: 400 });
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
        if (stoneColor === 0 && newBlackPotCount <= 0) {
          return NextResponse.json({ error: 'No black stones in pot' }, { status: 400 });
        }
        if (stoneColor === 1 && newWhitePotCount <= 0) {
          return NextResponse.json({ error: 'No white stones in pot' }, { status: 400 });
        }

        // Place the stone first
        newBoardState[toY][toX] = stoneColor as Stone;
        if (stoneColor === 0) {
          newBlackPotCount--;
          newBlackOnBoard++;
        } else {
          newWhitePotCount--;
          newWhiteOnBoard++;
        }
        newLastMoveX = toX;
        newLastMoveY = toY;

        // Check for MINE! BOOM!
        if (hasMine(minePositions, toX, toY)) {
          const targets = getExplosionTargets(newBoardState, toX, toY, boardSize);

          explosion = {
            triggerX: toX,
            triggerY: toY,
            triggerColor: stoneColor,
            destroyedStones: targets,
          };

          // Remove all exploded stones
          for (const target of targets) {
            newBoardState[target.y][target.x] = null;
            if (target.color === 0) {
              newBlackOnBoard--;
              newBlackExploded++;
            } else {
              newWhiteOnBoard--;
              newWhiteExploded++;
            }
          }

          // Remove the exploded mine from the list
          newMinePositions = newMinePositions.filter(m => !(m.x === toX && m.y === toY));

          newLastExplosionX = toX;
          newLastExplosionY = toY;
        }
        // Switch turn after placing a stone
        newCurrentTurn = newCurrentTurn === 0 ? 1 : 0;
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
        if (stone === 0) {
          newBlackPotCount++;
          newBlackOnBoard--;
        } else {
          newWhitePotCount++;
          newWhiteOnBoard--;
        }
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

        const stone = newBoardState[fromY][fromX];
        if (stone === null) {
          return NextResponse.json({ error: 'No stone at from position' }, { status: 400 });
        }
        if (newBoardState[toY][toX] !== null) {
          return NextResponse.json({ error: 'To position is occupied' }, { status: 400 });
        }

        // Move the stone
        newBoardState[fromY][fromX] = null;
        newBoardState[toY][toX] = stone;
        newLastMoveX = toX;
        newLastMoveY = toY;

        // Check for MINE at destination!
        if (hasMine(minePositions, toX, toY)) {
          const targets = getExplosionTargets(newBoardState, toX, toY, boardSize);

          explosion = {
            triggerX: toX,
            triggerY: toY,
            triggerColor: stone as number,
            destroyedStones: targets,
          };

          for (const target of targets) {
            newBoardState[target.y][target.x] = null;
            if (target.color === 0) {
              newBlackOnBoard--;
              newBlackExploded++;
            } else {
              newWhiteOnBoard--;
              newWhiteExploded++;
            }
          }

          // Remove the exploded mine from the list
          newMinePositions = newMinePositions.filter(m => !(m.x === toX && m.y === toY));

          newLastExplosionX = toX;
          newLastExplosionY = toY;
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    // After place or move (if no explosion), check for normal captures
    if ((actionType === 'place' || actionType === 'move') && !explosion) {
      const placedX = toX as number;
      const placedY = toY as number;
      const captureResult = detectAndRemoveCaptures(newBoardState, placedX, placedY);
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
        newKoPointX = captureResult.koPoint.x;
        newKoPointY = captureResult.koPoint.y;
      }
    }

    // Drone strike logic - random chance after each move (only on place/move actions, not during explosions)
    let droneStrike: DroneStrikeInfo | null = null;
    let newBlackDroned = game[0].blackDroned ?? 0;
    let newWhiteDroned = game[0].whiteDroned ?? 0;
    let newLastDroneTargetX: number | null = null;
    let newLastDroneTargetY: number | null = null;

    // Check if both players have stones on the board - drones can only strike when both armies are visible
    const blackStonesOnBoard = newBoardState.flat().filter(s => s === 0).length;
    const whiteStonesOnBoard = newBoardState.flat().filter(s => s === 1).length;
    const bothPlayersHaveStones = blackStonesOnBoard > 0 && whiteStonesOnBoard > 0;

    // Drone targets the current player's stones (enemy drone attacks you when you play)
    const currentPlayerColor = stoneColor ?? (actionType === 'move' ? (boardState[fromY!][fromX!] as number) : 0);
    if ((actionType === 'place' || actionType === 'move') && !explosion && bothPlayersHaveStones && Math.random() < DRONE_STRIKE_CHANCE) {
      const target = getRandomStonePosition(newBoardState, boardSize, currentPlayerColor);
      if (target) {
        const start = getDroneStartPosition(target.x, target.y, boardSize);
        droneStrike = {
          startX: start.x,
          startY: start.y,
          targetX: target.x,
          targetY: target.y,
          targetColor: target.color,
        };

        // Remove the target stone
        newBoardState[target.y][target.x] = null;
        if (target.color === 0) {
          newBlackOnBoard--;
          newBlackDroned++;
        } else {
          newWhiteOnBoard--;
          newWhiteDroned++;
        }
        newLastDroneTargetX = target.x;
        newLastDroneTargetY = target.y;
      }
    }

    // Log the action
    await db.insert(bangActions).values({
      id: crypto.randomUUID(),
      gameId,
      actionType,
      stoneColor: stoneColor ?? null,
      fromX: fromX ?? null,
      fromY: fromY ?? null,
      toX: toX ?? null,
      toY: toY ?? null,
      moveNumber,
      explosion,
      droneStrike,
    });

    // Update the game
    await db.update(bangGames).set({
      boardState: newBoardState,
      minePositions: newMinePositions,
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
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      lastExplosionX: newLastExplosionX,
      lastExplosionY: newLastExplosionY,
      lastDroneTargetX: newLastDroneTargetX,
      lastDroneTargetY: newLastDroneTargetY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
      currentTurn: newCurrentTurn,
      moveNumber,
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
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      lastExplosionX: newLastExplosionX,
      lastExplosionY: newLastExplosionY,
      lastDroneTargetX: newLastDroneTargetX,
      lastDroneTargetY: newLastDroneTargetY,
      currentTurn: newCurrentTurn,
      explosion: explosion ? true : false,
      droneStrike: droneStrike,
    });
  } catch (error) {
    console.error('Error performing bang action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
