import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crazyGames } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';

type CrazyStone = 0 | 1 | 2 | 3 | null; // 0=black, 1=white, 2=brown, 3=grey
type CrazyBoard = CrazyStone[][];
type Position = { x: number; y: number };

// Get adjacent positions
function getAdjacent(pos: Position, boardSize: number): Position[] {
  const adjacent: Position[] = [];
  const { x, y } = pos;
  if (x > 0) adjacent.push({ x: x - 1, y });
  if (x < boardSize - 1) adjacent.push({ x: x + 1, y });
  if (y > 0) adjacent.push({ x, y: y - 1 });
  if (y < boardSize - 1) adjacent.push({ x, y: y + 1 });
  return adjacent;
}

// Get connected group of same color
function getGroup(board: CrazyBoard, start: Position): Position[] {
  const boardSize = board.length;
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
    for (const adj of getAdjacent(pos, boardSize)) {
      if (!visited.has(`${adj.x},${adj.y}`)) {
        queue.push(adj);
      }
    }
  }
  return group;
}

// Count liberties of a group
function countLiberties(board: CrazyBoard, group: Position[]): number {
  const boardSize = board.length;
  const liberties = new Set<string>();
  for (const pos of group) {
    for (const adj of getAdjacent(pos, boardSize)) {
      if (board[adj.y][adj.x] === null) {
        liberties.add(`${adj.x},${adj.y}`);
      }
    }
  }
  return liberties.size;
}

// Check if placing stone would be suicide (4-player version)
function wouldBeSuicide(board: CrazyBoard, x: number, y: number, color: CrazyStone): boolean {
  if (color === null) return false;
  const boardSize = board.length;
  const testBoard = board.map(row => [...row]) as CrazyBoard;
  testBoard[y][x] = color;

  // Check if this placement captures any opponent stones (any other color)
  const adjacentPositions = getAdjacent({ x, y }, boardSize);
  for (const adj of adjacentPositions) {
    const adjColor = testBoard[adj.y][adj.x];
    if (adjColor !== null && adjColor !== color) {
      const group = getGroup(testBoard, adj);
      if (countLiberties(testBoard, group) === 0) {
        return false; // Captures, so not suicide
      }
    }
  }

  // Check if placed stone's group has liberties
  const placedGroup = getGroup(testBoard, { x, y });
  return countLiberties(testBoard, placedGroup) === 0;
}

// Detect and remove captures (4-player version)
function detectAndRemoveCaptures(board: CrazyBoard, lastPlacedX?: number, lastPlacedY?: number): {
  newBoard: CrazyBoard;
  captured: { black: number; white: number; brown: number; grey: number };
  koPoint: Position | null;
} {
  const boardSize = board.length;
  const newBoard = board.map(row => [...row]) as CrazyBoard;
  const visited = new Set<string>();
  const captured = { black: 0, white: 0, brown: 0, grey: 0 };
  const capturedPositions: Position[] = [];

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const stone = newBoard[y][x];
      if (stone === null) continue;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const group = getGroup(newBoard, { x, y });
      for (const pos of group) {
        visited.add(`${pos.x},${pos.y}`);
      }

      if (countLiberties(newBoard, group) === 0) {
        for (const pos of group) {
          newBoard[pos.y][pos.x] = null;
          capturedPositions.push(pos);
        }
        if (stone === 0) captured.black += group.length;
        else if (stone === 1) captured.white += group.length;
        else if (stone === 2) captured.brown += group.length;
        else if (stone === 3) captured.grey += group.length;
      }
    }
  }

  // Ko detection
  let koPoint: Position | null = null;
  if (capturedPositions.length === 1 && lastPlacedX !== undefined && lastPlacedY !== undefined) {
    const capturingGroup = getGroup(newBoard, { x: lastPlacedX, y: lastPlacedY });
    if (capturingGroup.length === 1 && countLiberties(newBoard, capturingGroup) === 1) {
      koPoint = capturedPositions[0];
    }
  }

  return { newBoard, captured, koPoint };
}

// POST /api/crazy/[gameId]/action
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
    let newBoardState = boardState.map(row => [...row]) as CrazyBoard;
    let newBlackPotCount = game[0].blackPotCount;
    let newWhitePotCount = game[0].whitePotCount;
    let newBrownPotCount = game[0].brownPotCount;
    let newGreyPotCount = game[0].greyPotCount;
    let newBlackReturned = game[0].blackReturned;
    let newWhiteReturned = game[0].whiteReturned;
    let newBrownReturned = game[0].brownReturned;
    let newGreyReturned = game[0].greyReturned;
    let newLastMoveX: number | null = game[0].lastMoveX;
    let newLastMoveY: number | null = game[0].lastMoveY;
    let newKoPointX: number | null = null;
    let newKoPointY: number | null = null;
    const currentKoPointX = game[0].koPointX;
    const currentKoPointY = game[0].koPointY;

    switch (actionType) {
      case 'place': {
        if (typeof stoneColor !== 'number' || ![0, 1, 2, 3].includes(stoneColor)) {
          return NextResponse.json({ error: 'Invalid stone color' }, { status: 400 });
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
        const totals = {
          0: newBlackPotCount + newBlackReturned,
          1: newWhitePotCount + newWhiteReturned,
          2: newBrownPotCount + newBrownReturned,
          3: newGreyPotCount + newGreyReturned,
        };

        if (totals[stoneColor as 0|1|2|3] <= 0) {
          return NextResponse.json({ error: 'No stones of this color in pot' }, { status: 400 });
        }

        // Check suicide
        if (wouldBeSuicide(newBoardState, toX, toY, stoneColor as CrazyStone)) {
          return NextResponse.json({ error: 'Suicide move not allowed' }, { status: 400 });
        }

        // Check Ko
        if (currentKoPointX !== null && currentKoPointY !== null && toX === currentKoPointX && toY === currentKoPointY) {
          return NextResponse.json({ error: 'Ko rule violation' }, { status: 400 });
        }

        // Place stone
        newBoardState[toY][toX] = stoneColor as CrazyStone;
        if (stoneColor === 0) {
          if (newBlackReturned > 0) newBlackReturned--;
          else newBlackPotCount--;
        } else if (stoneColor === 1) {
          if (newWhiteReturned > 0) newWhiteReturned--;
          else newWhitePotCount--;
        } else if (stoneColor === 2) {
          if (newBrownReturned > 0) newBrownReturned--;
          else newBrownPotCount--;
        } else if (stoneColor === 3) {
          if (newGreyReturned > 0) newGreyReturned--;
          else newGreyPotCount--;
        }
        newLastMoveX = toX;
        newLastMoveY = toY;
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
        if (stone === 0) newBlackReturned++;
        else if (stone === 1) newWhiteReturned++;
        else if (stone === 2) newBrownReturned++;
        else if (stone === 3) newGreyReturned++;
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

        const testBoard = newBoardState.map(row => [...row]) as CrazyBoard;
        testBoard[fromY][fromX] = null;
        if (wouldBeSuicide(testBoard, toX, toY, stone)) {
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
      const captureResult = detectAndRemoveCaptures(newBoardState, placedX, placedY);
      newBoardState = captureResult.newBoard;

      newBlackReturned += captureResult.captured.black;
      newWhiteReturned += captureResult.captured.white;
      newBrownReturned += captureResult.captured.brown;
      newGreyReturned += captureResult.captured.grey;

      if (captureResult.koPoint) {
        newKoPointX = captureResult.koPoint.x;
        newKoPointY = captureResult.koPoint.y;
      }
    }

    // Update the board
    await db.update(crazyGames).set({
      boardState: newBoardState,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      brownPotCount: newBrownPotCount,
      greyPotCount: newGreyPotCount,
      blackReturned: newBlackReturned,
      whiteReturned: newWhiteReturned,
      brownReturned: newBrownReturned,
      greyReturned: newGreyReturned,
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
      updatedAt: new Date(),
    }).where(eq(crazyGames.id, gameId));

    return NextResponse.json({
      success: true,
      boardState: newBoardState,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      brownPotCount: newBrownPotCount,
      greyPotCount: newGreyPotCount,
      blackReturned: newBlackReturned,
      whiteReturned: newWhiteReturned,
      brownReturned: newBrownReturned,
      greyReturned: newGreyReturned,
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
    });
  } catch (error) {
    console.error('Error performing action:', error);
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
