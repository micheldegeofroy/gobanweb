// Go game logic - handles move validation, captures, and ko rule

export type Stone = 0 | 1 | null; // 0 = black, 1 = white, null = empty
export type Board = Stone[][];
export type Position = { x: number; y: number };

export interface GameState {
  board: Board;
  currentPlayer: 0 | 1;
  captures: { black: number; white: number };
  lastMove: Position | null;
  koPoint: Position | null;
  moveHistory: Position[];
  consecutivePasses: number;
}

// Create an empty board of given size
export function createEmptyBoard(size: number): Board {
  return Array(size).fill(null).map(() => Array(size).fill(null));
}

// Create initial game state
export function createGameState(boardSize: number = 19): GameState {
  return {
    board: createEmptyBoard(boardSize),
    currentPlayer: 0, // Black plays first
    captures: { black: 0, white: 0 },
    lastMove: null,
    koPoint: null,
    moveHistory: [],
    consecutivePasses: 0,
  };
}

// Get adjacent positions (up, down, left, right)
function getAdjacent(pos: Position, boardSize: number): Position[] {
  const adjacent: Position[] = [];
  const { x, y } = pos;

  if (x > 0) adjacent.push({ x: x - 1, y });
  if (x < boardSize - 1) adjacent.push({ x: x + 1, y });
  if (y > 0) adjacent.push({ x, y: y - 1 });
  if (y < boardSize - 1) adjacent.push({ x, y: y + 1 });

  return adjacent;
}

// Find all stones in a connected group
function getGroup(board: Board, start: Position): Position[] {
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

// Count liberties (empty adjacent points) of a group
function countLiberties(board: Board, group: Position[]): number {
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

// Check if a move is valid
export function isValidMove(
  state: GameState,
  pos: Position,
  player: 0 | 1
): { valid: boolean; reason?: string } {
  const { board, koPoint } = state;
  const boardSize = board.length;

  // Check bounds
  if (pos.x < 0 || pos.x >= boardSize || pos.y < 0 || pos.y >= boardSize) {
    return { valid: false, reason: 'Out of bounds' };
  }

  // Check if position is empty
  if (board[pos.y][pos.x] !== null) {
    return { valid: false, reason: 'Position is occupied' };
  }

  // Check ko rule
  if (koPoint && koPoint.x === pos.x && koPoint.y === pos.y) {
    return { valid: false, reason: 'Ko rule violation' };
  }

  // Simulate the move to check for suicide
  const testBoard = board.map(row => [...row]);
  testBoard[pos.y][pos.x] = player;

  // First, check if this move captures any opponent stones
  const opponent = player === 0 ? 1 : 0;
  let wouldCapture = false;

  for (const adj of getAdjacent(pos, boardSize)) {
    if (testBoard[adj.y][adj.x] === opponent) {
      const group = getGroup(testBoard, adj);
      if (countLiberties(testBoard, group) === 0) {
        wouldCapture = true;
        break;
      }
    }
  }

  // If no capture, check if the placed stone's group has liberties
  if (!wouldCapture) {
    const group = getGroup(testBoard, pos);
    if (countLiberties(testBoard, group) === 0) {
      return { valid: false, reason: 'Suicide is not allowed' };
    }
  }

  return { valid: true };
}

// Apply a move and return the new state
export function applyMove(
  state: GameState,
  pos: Position,
  player: 0 | 1
): { newState: GameState; capturedStones: Position[] } {
  const boardSize = state.board.length;
  const newBoard = state.board.map(row => [...row]);
  newBoard[pos.y][pos.x] = player;

  const opponent = player === 0 ? 1 : 0;
  const capturedStones: Position[] = [];

  // Check all adjacent opponent groups for captures
  for (const adj of getAdjacent(pos, boardSize)) {
    if (newBoard[adj.y][adj.x] === opponent) {
      const group = getGroup(newBoard, adj);
      if (countLiberties(newBoard, group) === 0) {
        // Capture this group
        for (const stone of group) {
          newBoard[stone.y][stone.x] = null;
          capturedStones.push(stone);
        }
      }
    }
  }

  // Update captures count
  const newCaptures = { ...state.captures };
  if (player === 0) {
    newCaptures.black += capturedStones.length;
  } else {
    newCaptures.white += capturedStones.length;
  }

  // Determine ko point: if exactly one stone was captured and the capturing
  // stone has exactly one liberty (the captured position), it's a potential ko
  let newKoPoint: Position | null = null;
  if (capturedStones.length === 1) {
    const capturingGroup = getGroup(newBoard, pos);
    if (capturingGroup.length === 1 && countLiberties(newBoard, capturingGroup) === 1) {
      newKoPoint = capturedStones[0];
    }
  }

  const newState: GameState = {
    board: newBoard,
    currentPlayer: opponent,
    captures: newCaptures,
    lastMove: pos,
    koPoint: newKoPoint,
    moveHistory: [...state.moveHistory, pos],
    consecutivePasses: 0,
  };

  return { newState, capturedStones };
}

// Pass turn
export function passTurn(state: GameState): GameState {
  const opponent = state.currentPlayer === 0 ? 1 : 0;
  return {
    ...state,
    currentPlayer: opponent,
    koPoint: null, // Ko is lifted after a pass
    consecutivePasses: state.consecutivePasses + 1,
  };
}

// Check if game is over (two consecutive passes)
export function isGameOver(state: GameState): boolean {
  return state.consecutivePasses >= 2;
}

// Simple territory counting (basic implementation)
// A more sophisticated implementation would use Benson's algorithm or similar
export function countTerritory(board: Board): { black: number; white: number } {
  const boardSize = board.length;
  const territory = { black: 0, white: 0 };
  const visited = new Set<string>();

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      if (board[y][x] !== null || visited.has(`${x},${y}`)) continue;

      // Flood fill to find connected empty region
      const region: Position[] = [];
      const queue: Position[] = [{ x, y }];
      const borderingColors = new Set<Stone>();

      while (queue.length > 0) {
        const pos = queue.shift()!;
        const key = `${pos.x},${pos.y}`;

        if (visited.has(key)) continue;

        const cell = board[pos.y][pos.x];
        if (cell !== null) {
          borderingColors.add(cell);
          continue;
        }

        visited.add(key);
        region.push(pos);

        for (const adj of getAdjacent(pos, boardSize)) {
          if (!visited.has(`${adj.x},${adj.y}`)) {
            queue.push(adj);
          }
        }
      }

      // If region borders only one color, it's that color's territory
      if (borderingColors.size === 1) {
        const owner = Array.from(borderingColors)[0];
        if (owner === 0) {
          territory.black += region.length;
        } else {
          territory.white += region.length;
        }
      }
    }
  }

  return territory;
}

// Check if placing a stone would be suicide (no liberties and doesn't capture anything)
// A move is suicide only if AFTER captures are processed, the placed stone has no liberties
export function wouldBeSuicide(board: Board, x: number, y: number, color: 0 | 1): boolean {
  const boardSize = board.length;
  const testBoard = board.map(row => [...row]);
  testBoard[y][x] = color;

  const opponent = color === 0 ? 1 : 0;

  // First, find and remove any opponent groups that would be captured
  // This must happen BEFORE checking if the placed stone has liberties
  const adjacentPositions = getAdjacent({ x, y }, boardSize);
  for (const adj of adjacentPositions) {
    if (testBoard[adj.y][adj.x] === opponent) {
      const group = getGroupFromBoard(testBoard, adj);
      if (countLibertiesFromBoard(testBoard, group) === 0) {
        // Remove the captured group from the test board
        for (const pos of group) {
          testBoard[pos.y][pos.x] = null;
        }
      }
    }
  }

  // Now check if the placed stone's group has liberties (after captures are removed)
  const placedGroup = getGroupFromBoard(testBoard, { x, y });
  return countLibertiesFromBoard(testBoard, placedGroup) === 0;
}

// Detect and remove captured stones from the board (for shared board mode)
// Returns the updated board, count of captured stones by color, and potential Ko point
export function detectAndRemoveCaptures(board: Board, lastPlacedX?: number, lastPlacedY?: number): {
  newBoard: Board;
  blackCaptured: number;
  whiteCaptured: number;
  koPoint: Position | null;
} {
  const boardSize = board.length;
  const newBoard = board.map(row => [...row]);
  const visited = new Set<string>();
  let blackCaptured = 0;
  let whiteCaptured = 0;
  const capturedPositions: Position[] = [];

  // Check all positions for captured groups
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const stone = newBoard[y][x];
      if (stone === null) continue;

      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      // Get the group this stone belongs to
      const group = getGroupFromBoard(newBoard, { x, y });

      // Mark all stones in group as visited
      for (const pos of group) {
        visited.add(`${pos.x},${pos.y}`);
      }

      // Check if this group has any liberties
      const liberties = countLibertiesFromBoard(newBoard, group);

      if (liberties === 0) {
        // Capture this group - remove all stones
        for (const pos of group) {
          newBoard[pos.y][pos.x] = null;
          capturedPositions.push(pos);
        }

        // Count captures by color
        if (stone === 0) {
          blackCaptured += group.length;
        } else {
          whiteCaptured += group.length;
        }
      }
    }
  }

  // Determine Ko point: if exactly one stone was captured and the capturing stone
  // has exactly one liberty (the captured position), it's a Ko
  let koPoint: Position | null = null;
  if (capturedPositions.length === 1 && lastPlacedX !== undefined && lastPlacedY !== undefined) {
    const capturingGroup = getGroupFromBoard(newBoard, { x: lastPlacedX, y: lastPlacedY });
    if (capturingGroup.length === 1) {
      const capturingLiberties = countLibertiesFromBoard(newBoard, capturingGroup);
      if (capturingLiberties === 1) {
        // The only liberty must be the captured position - this is Ko
        koPoint = capturedPositions[0];
      }
    }
  }

  return { newBoard, blackCaptured, whiteCaptured, koPoint };
}

// Helper functions for shared board mode (don't require full GameState)
function getGroupFromBoard(board: Board, start: Position): Position[] {
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

function countLibertiesFromBoard(board: Board, group: Position[]): number {
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

// Calculate final score (territory + captures)
export function calculateScore(
  state: GameState,
  komi: number = 6.5
): { black: number; white: number; winner: 0 | 1 | 'tie' } {
  const territory = countTerritory(state.board);

  const blackScore = territory.black + state.captures.black;
  const whiteScore = territory.white + state.captures.white + komi;

  return {
    black: blackScore,
    white: whiteScore,
    winner: blackScore > whiteScore ? 0 : whiteScore > blackScore ? 1 : 'tie',
  };
}
