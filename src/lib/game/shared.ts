// Shared game logic utilities for all Go variants (Normal, Crazy, Wilde)
// This consolidates duplicated code across API routes

export type Position = { x: number; y: number };

// Generic stone type - number for player index, null for empty
export type GenericStone = number | null;
export type GenericBoard = GenericStone[][];

// Get adjacent positions for rectangular board
export function getAdjacent(pos: Position, width: number, height: number): Position[] {
  const adjacent: Position[] = [];
  const { x, y } = pos;
  if (x > 0) adjacent.push({ x: x - 1, y });
  if (x < width - 1) adjacent.push({ x: x + 1, y });
  if (y > 0) adjacent.push({ x, y: y - 1 });
  if (y < height - 1) adjacent.push({ x, y: y + 1 });
  return adjacent;
}

// Overload for square boards
export function getAdjacentSquare(pos: Position, boardSize: number): Position[] {
  return getAdjacent(pos, boardSize, boardSize);
}

// Get connected group of same color
export function getGroup(board: GenericBoard, start: Position, width: number, height: number): Position[] {
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

// Overload for square boards
export function getGroupSquare(board: GenericBoard, start: Position, boardSize: number): Position[] {
  return getGroup(board, start, boardSize, boardSize);
}

// Count liberties of a group
export function countLiberties(board: GenericBoard, group: Position[], width: number, height: number): number {
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

// Overload for square boards
export function countLibertiesSquare(board: GenericBoard, group: Position[], boardSize: number): number {
  return countLiberties(board, group, boardSize, boardSize);
}

// Check if placing stone would be suicide
// A move is suicide only if AFTER captures are processed, the placed stone has no liberties
export function wouldBeSuicide(
  board: GenericBoard,
  x: number,
  y: number,
  color: number,
  width: number,
  height: number
): boolean {
  const testBoard = board.map(row => [...row]) as GenericBoard;
  testBoard[y][x] = color;

  // First, find and remove any opponent groups that would be captured
  const adjacentPositions = getAdjacent({ x, y }, width, height);
  for (const adj of adjacentPositions) {
    const adjColor = testBoard[adj.y][adj.x];
    if (adjColor !== null && adjColor !== color) {
      const group = getGroup(testBoard, adj, width, height);
      if (countLiberties(testBoard, group, width, height) === 0) {
        // Remove the captured group from the test board
        for (const pos of group) {
          testBoard[pos.y][pos.x] = null;
        }
      }
    }
  }

  // Now check if the placed stone's group has liberties (after captures are removed)
  const placedGroup = getGroup(testBoard, { x, y }, width, height);
  return countLiberties(testBoard, placedGroup, width, height) === 0;
}

// Overload for square boards
export function wouldBeSuicideSquare(
  board: GenericBoard,
  x: number,
  y: number,
  color: number,
  boardSize: number
): boolean {
  return wouldBeSuicide(board, x, y, color, boardSize, boardSize);
}

// Result of capture detection
export interface CaptureResult {
  newBoard: GenericBoard;
  capturedByColor: Map<number, number>; // player -> count of their stones captured
  capturedPositions: Position[]; // all captured positions for Ko detection
  koPoint: Position | null;
}

// Detect and remove captures from board
export function detectAndRemoveCaptures(
  board: GenericBoard,
  width: number,
  height: number,
  lastPlacedX?: number,
  lastPlacedY?: number
): CaptureResult {
  const newBoard = board.map(row => [...row]) as GenericBoard;
  const visited = new Set<string>();
  const capturedByColor = new Map<number, number>();
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
        capturedByColor.set(stone, (capturedByColor.get(stone) || 0) + group.length);
      }
    }
  }

  // Ko detection: if exactly one stone captured and capturer has exactly one liberty
  let koPoint: Position | null = null;
  if (capturedPositions.length === 1 && lastPlacedX !== undefined && lastPlacedY !== undefined) {
    const capturingGroup = getGroup(newBoard, { x: lastPlacedX, y: lastPlacedY }, width, height);
    if (capturingGroup.length === 1 && countLiberties(newBoard, capturingGroup, width, height) === 1) {
      koPoint = capturedPositions[0];
    }
  }

  return { newBoard, capturedByColor, capturedPositions, koPoint };
}

// Create empty board
export function createEmptyBoard(width: number, height: number): GenericBoard {
  return Array(height).fill(null).map(() => Array(width).fill(null));
}

// Create empty square board
export function createEmptySquareBoard(size: number): GenericBoard {
  return createEmptyBoard(size, size);
}

// Validate position is within bounds
export function isValidPosition(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

// Validate stone color for a given player count
export function isValidStoneColor(color: number, playerCount: number): boolean {
  return Number.isInteger(color) && color >= 0 && color < playerCount;
}

// Type guard for checking if a value is a valid stone color
export function assertStoneColor(value: unknown, playerCount: number): value is number {
  return typeof value === 'number' && isValidStoneColor(value, playerCount);
}
