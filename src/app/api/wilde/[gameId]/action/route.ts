import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wildeGames, wildeActions, StonePot } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import { randomUUID } from 'crypto';

type WildeStone = number | null; // 0-7 for players, null for empty
type WildeBoard = WildeStone[][];
type Position = { x: number; y: number };

// Get adjacent positions for rectangular board
function getAdjacent(pos: Position, width: number, height: number): Position[] {
  const adjacent: Position[] = [];
  const { x, y } = pos;
  if (x > 0) adjacent.push({ x: x - 1, y });
  if (x < width - 1) adjacent.push({ x: x + 1, y });
  if (y > 0) adjacent.push({ x, y: y - 1 });
  if (y < height - 1) adjacent.push({ x, y: y + 1 });
  return adjacent;
}

// Get connected group of same color
function getGroup(board: WildeBoard, start: Position, width: number, height: number): Position[] {
  const color = board[start.y][start.x];
  if (color === null) return [];

  const group: Position[] = [];
  const visited = new Set<string>();
  const queue: Position[] = [start];

  while (queue.length > 0) {
    const pos = queue.shift()!;
    const key = `${pos.x},${pos.y}`;
    if (visited.has(key)) continue;
    if (board[pos.y][pos.x] !== color) continue;
    visited.add(key);
    group.push(pos);
    for (const adj of getAdjacent(pos, width, height)) {
      if (!visited.has(`${adj.x},${adj.y}`)) {
        queue.push(adj);
      }
    }
  }
  return group;
}

// Count liberties of a group
function countLiberties(board: WildeBoard, group: Position[], width: number, height: number): number {
  const liberties = new Set<string>();
  for (const pos of group) {
    for (const adj of getAdjacent(pos, width, height)) {
      if (board[adj.y][adj.x] === null) {
        liberties.add(`${adj.x},${adj.y}`);
      }
    }
  }
  return liberties.size;
}

// Check if placing stone would be suicide (N-player version)
function wouldBeSuicide(board: WildeBoard, x: number, y: number, color: number, width: number, height: number): boolean {
  const testBoard = board.map(row => [...row]) as WildeBoard;
  testBoard[y][x] = color;

  // Check if this placement captures any opponent stones (any other color)
  const adjacentPositions = getAdjacent({ x, y }, width, height);
  for (const adj of adjacentPositions) {
    const adjColor = testBoard[adj.y][adj.x];
    if (adjColor !== null && adjColor !== color) {
      const group = getGroup(testBoard, adj, width, height);
      if (countLiberties(testBoard, group, width, height) === 0) {
        return false; // Captures, so not suicide
      }
    }
  }

  // Check if placed stone's group has liberties
  const placedGroup = getGroup(testBoard, { x, y }, width, height);
  return countLiberties(testBoard, placedGroup, width, height) === 0;
}

// Detect and remove captures (N-player version)
function detectAndRemoveCaptures(
  board: WildeBoard,
  playerCount: number,
  width: number,
  height: number,
  lastPlacedX?: number,
  lastPlacedY?: number
): {
  newBoard: WildeBoard;
  capturedByColor: number[]; // Array of captured counts per player
  koPoint: Position | null;
} {
  const newBoard = board.map(row => [...row]) as WildeBoard;
  const visited = new Set<string>();
  const capturedByColor = Array(playerCount).fill(0);
  const capturedPositions: Position[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const stone = newBoard[y][x];
      if (stone === null) continue;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const group = getGroup(newBoard, { x, y }, width, height);
      for (const pos of group) {
        visited.add(`${pos.x},${pos.y}`);
      }

      if (countLiberties(newBoard, group, width, height) === 0) {
        for (const pos of group) {
          newBoard[pos.y][pos.x] = null;
          capturedPositions.push(pos);
        }
        capturedByColor[stone] += group.length;
      }
    }
  }

  // Ko detection
  let koPoint: Position | null = null;
  if (capturedPositions.length === 1 && lastPlacedX !== undefined && lastPlacedY !== undefined) {
    const capturingGroup = getGroup(newBoard, { x: lastPlacedX, y: lastPlacedY }, width, height);
    if (capturingGroup.length === 1 && countLiberties(newBoard, capturingGroup, width, height) === 1) {
      koPoint = capturedPositions[0];
    }
  }

  return { newBoard, capturedByColor, koPoint };
}

// POST /api/wilde/[gameId]/action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { privateKey, actionType, stoneColor, fromX, fromY, toX, toY } = body;

    if (!privateKey) {
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }

    const game = await db
      .select()
      .from(wildeGames)
      .where(eq(wildeGames.id, gameId))
      .limit(1);

    if (game.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    const boardState = game[0].boardState as WildeBoard;
    const width = game[0].boardWidth;
    const height = game[0].boardHeight;
    const playerCount = game[0].playerCount;
    let newBoardState = boardState.map(row => [...row]) as WildeBoard;
    let newStonePots = [...(game[0].stonePots as StonePot[])];
    let newLastMoveX: number | null = game[0].lastMoveX;
    let newLastMoveY: number | null = game[0].lastMoveY;
    let newKoPointX: number | null = null;
    let newKoPointY: number | null = null;
    const currentKoPointX = game[0].koPointX;
    const currentKoPointY = game[0].koPointY;
    let currentTurn = game[0].currentTurn;
    let moveNumber = game[0].moveNumber;

    switch (actionType) {
      case 'place': {
        if (typeof stoneColor !== 'number' || stoneColor < 0 || stoneColor >= playerCount) {
          return NextResponse.json({ error: 'Invalid stone color' }, { status: 400 });
        }
        // Enforce turn order
        if (stoneColor !== currentTurn) {
          return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
        }
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (toX < 0 || toX >= width || toY < 0 || toY >= height) {
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }
        if (newBoardState[toY][toX] !== null) {
          return NextResponse.json({ error: 'Position is occupied' }, { status: 400 });
        }

        // Check pot has stones
        const pot = newStonePots[stoneColor];
        if (pot.potCount + pot.returned <= 0) {
          return NextResponse.json({ error: 'No stones of this color in pot' }, { status: 400 });
        }

        // Check suicide
        if (wouldBeSuicide(newBoardState, toX, toY, stoneColor, width, height)) {
          return NextResponse.json({ error: 'Suicide move not allowed' }, { status: 400 });
        }

        // Check Ko
        if (currentKoPointX !== null && currentKoPointY !== null && toX === currentKoPointX && toY === currentKoPointY) {
          return NextResponse.json({ error: 'Ko rule violation' }, { status: 400 });
        }

        // Place stone
        newBoardState[toY][toX] = stoneColor;
        // Decrement from returned first, then pot
        if (newStonePots[stoneColor].returned > 0) {
          newStonePots[stoneColor] = { ...newStonePots[stoneColor], returned: newStonePots[stoneColor].returned - 1 };
        } else {
          newStonePots[stoneColor] = { ...newStonePots[stoneColor], potCount: newStonePots[stoneColor].potCount - 1 };
        }
        newLastMoveX = toX;
        newLastMoveY = toY;
        // Advance turn: cycle through players
        currentTurn = (currentTurn + 1) % playerCount;
        break;
      }

      case 'remove': {
        if (typeof fromX !== 'number' || typeof fromY !== 'number') {
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (fromX < 0 || fromX >= width || fromY < 0 || fromY >= height) {
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }

        const stone = newBoardState[fromY][fromX];
        if (stone === null) {
          return NextResponse.json({ error: 'No stone at position' }, { status: 400 });
        }

        newBoardState[fromY][fromX] = null;
        newStonePots[stone] = { ...newStonePots[stone], returned: newStonePots[stone].returned + 1 };
        break;
      }

      case 'move': {
        if (typeof fromX !== 'number' || typeof fromY !== 'number') {
          return NextResponse.json({ error: 'Invalid from position' }, { status: 400 });
        }
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          return NextResponse.json({ error: 'Invalid to position' }, { status: 400 });
        }
        if (fromX < 0 || fromX >= width || fromY < 0 || fromY >= height) {
          return NextResponse.json({ error: 'From position out of bounds' }, { status: 400 });
        }
        if (toX < 0 || toX >= width || toY < 0 || toY >= height) {
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

        const testBoard = newBoardState.map(row => [...row]) as WildeBoard;
        testBoard[fromY][fromX] = null;
        if (wouldBeSuicide(testBoard, toX, toY, stone, width, height)) {
          return NextResponse.json({ error: 'Suicide move not allowed' }, { status: 400 });
        }

        newBoardState[fromY][fromX] = null;
        newBoardState[toY][toX] = stone;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    // Check for captures after place or move
    if (actionType === 'place' || actionType === 'move') {
      const placedX = toX as number;
      const placedY = toY as number;
      const captureResult = detectAndRemoveCaptures(newBoardState, playerCount, width, height, placedX, placedY);
      newBoardState = captureResult.newBoard;

      // Add captured stones to returned count for each player
      for (let i = 0; i < playerCount; i++) {
        if (captureResult.capturedByColor[i] > 0) {
          newStonePots[i] = { ...newStonePots[i], returned: newStonePots[i].returned + captureResult.capturedByColor[i] };
        }
      }

      if (captureResult.koPoint) {
        newKoPointX = captureResult.koPoint.x;
        newKoPointY = captureResult.koPoint.y;
      }
    }

    // Log the action for replay
    moveNumber++;
    await db.insert(wildeActions).values({
      id: randomUUID(),
      gameId,
      actionType,
      stoneColor: stoneColor ?? null,
      fromX: fromX ?? null,
      fromY: fromY ?? null,
      toX: toX ?? null,
      toY: toY ?? null,
      moveNumber,
    });

    // Update the board
    await db.update(wildeGames).set({
      boardState: newBoardState,
      stonePots: newStonePots,
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
      currentTurn: currentTurn,
      moveNumber: moveNumber,
      updatedAt: new Date(),
    }).where(eq(wildeGames.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: newBoardState,
      stonePots: newStonePots,
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
      currentTurn: currentTurn,
      moveNumber: moveNumber,
    });
  } catch (error) {
    console.error('Error performing action:', error);
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
