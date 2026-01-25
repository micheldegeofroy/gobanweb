import { NextRequest, NextResponse } from 'next/server';
import { db, games, actions } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import type { Board, Stone } from '@/lib/game/logic';
import { detectAndRemoveCaptures, wouldBeSuicide } from '@/lib/game/logic';
import { errorResponse, ERROR_IDS } from '@/lib/errors';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

// POST /api/games/[gameId]/action - Perform an action on the board
// Actions: place (from pot to board), remove (from board to pot), move (on board)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitKey = `games:action:${gameId}:${clientIP}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.gameAction);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        }
      );
    }

    const body = await request.json();
    const { privateKey, actionType, stoneColor, fromX, fromY, toX, toY } = body;

    if (!privateKey) {
      const err = await errorResponse(ERROR_IDS.NORMAL_PRIVATE_KEY_REQUIRED, 'Private key is required', 400);
      if (err) return err;
      return NextResponse.json(
        { error: 'Private key is required' },
        { status: 400 }
      );
    }

    // Get the game
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

    // Verify the private key
    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      const err = await errorResponse(ERROR_IDS.NORMAL_INVALID_PRIVATE_KEY, 'Invalid private key', 401);
      if (err) return err;
      return NextResponse.json({ error: 'Invalid private key' }, { status: 401 });
    }

    const boardState = game[0].boardState as Board;
    const boardSize = game[0].boardSize;
    let newBoardState = boardState.map(row => [...row]);
    let newBlackPotCount = game[0].blackPotCount;
    let newWhitePotCount = game[0].whitePotCount;
    let newBlackCaptured = game[0].blackCaptured;
    let newWhiteCaptured = game[0].whiteCaptured;
    let newBlackOnBoard = game[0].blackOnBoard;
    let newWhiteOnBoard = game[0].whiteOnBoard;
    let newLastMoveX: number | null = game[0].lastMoveX;
    let newLastMoveY: number | null = game[0].lastMoveY;
    let newKoPointX: number | null = null;
    let newKoPointY: number | null = null;
    const currentKoPointX = game[0].koPointX;
    const currentKoPointY = game[0].koPointY;

    switch (actionType) {
      case 'place': {
        // Place a stone from pot to board
        if (typeof stoneColor !== 'number' || ![0, 1].includes(stoneColor)) {
          const err = await errorResponse(ERROR_IDS.NORMAL_INVALID_STONE_COLOR, 'Invalid stone color', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Invalid stone color' }, { status: 400 });
        }
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          const err = await errorResponse(ERROR_IDS.NORMAL_INVALID_POSITION, 'Invalid position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (toX < 0 || toX >= boardSize || toY < 0 || toY >= boardSize) {
          const err = await errorResponse(ERROR_IDS.NORMAL_POSITION_OUT_OF_BOUNDS, 'Position out of bounds', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }
        if (newBoardState[toY][toX] !== null) {
          const err = await errorResponse(ERROR_IDS.NORMAL_POSITION_OCCUPIED, 'Position is occupied', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Position is occupied' }, { status: 400 });
        }

        // Check if this would be suicide (no liberties and doesn't capture)
        if (wouldBeSuicide(newBoardState, toX, toY, stoneColor as 0 | 1)) {
          const err = await errorResponse(ERROR_IDS.NORMAL_SUICIDE_NOT_ALLOWED, 'Cannot place stone with no liberties unless it captures', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Cannot place stone with no liberties unless it captures' }, { status: 400 });
        }

        // Check Ko rule - cannot play on Ko point
        if (currentKoPointX !== null && currentKoPointY !== null && toX === currentKoPointX && toY === currentKoPointY) {
          const err = await errorResponse(ERROR_IDS.NORMAL_KO_VIOLATION, 'Ko rule violation - cannot recapture immediately', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Ko rule violation - cannot recapture immediately' }, { status: 400 });
        }

        // Place the stone - decrement pot, increment onBoard
        newBoardState[toY][toX] = stoneColor as Stone;
        if (stoneColor === 0) {
          newBlackPotCount--;
          newBlackOnBoard++;
        } else {
          newWhitePotCount--;
          newWhiteOnBoard++;
        }
        // Track this as the last move
        newLastMoveX = toX;
        newLastMoveY = toY;
        break;
      }

      case 'remove': {
        // Remove a stone from board to returned pile
        if (typeof fromX !== 'number' || typeof fromY !== 'number') {
          const err = await errorResponse(ERROR_IDS.NORMAL_INVALID_FROM_POSITION, 'Invalid position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }
        if (fromX < 0 || fromX >= boardSize || fromY < 0 || fromY >= boardSize) {
          const err = await errorResponse(ERROR_IDS.NORMAL_FROM_OUT_OF_BOUNDS, 'Position out of bounds', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Position out of bounds' }, { status: 400 });
        }

        const stone = newBoardState[fromY][fromX];
        if (stone === null) {
          const err = await errorResponse(ERROR_IDS.NORMAL_NO_STONE_AT_POSITION, 'No stone at position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'No stone at position' }, { status: 400 });
        }

        // Remove the stone - increment pot, decrement onBoard
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
        // Move a stone on the board
        if (typeof fromX !== 'number' || typeof fromY !== 'number') {
          const err = await errorResponse(ERROR_IDS.NORMAL_INVALID_FROM_POSITION, 'Invalid from position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Invalid from position' }, { status: 400 });
        }
        if (typeof toX !== 'number' || typeof toY !== 'number') {
          const err = await errorResponse(ERROR_IDS.NORMAL_INVALID_TO_POSITION, 'Invalid to position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Invalid to position' }, { status: 400 });
        }
        if (fromX < 0 || fromX >= boardSize || fromY < 0 || fromY >= boardSize) {
          const err = await errorResponse(ERROR_IDS.NORMAL_FROM_OUT_OF_BOUNDS, 'From position out of bounds', 400);
          if (err) return err;
          return NextResponse.json({ error: 'From position out of bounds' }, { status: 400 });
        }
        if (toX < 0 || toX >= boardSize || toY < 0 || toY >= boardSize) {
          const err = await errorResponse(ERROR_IDS.NORMAL_TO_OUT_OF_BOUNDS, 'To position out of bounds', 400);
          if (err) return err;
          return NextResponse.json({ error: 'To position out of bounds' }, { status: 400 });
        }
        if (fromX === toX && fromY === toY) {
          const err = await errorResponse(ERROR_IDS.NORMAL_SAME_POSITION, 'Cannot move to same position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Cannot move to same position' }, { status: 400 });
        }

        const stone = newBoardState[fromY][fromX];
        if (stone === null) {
          const err = await errorResponse(ERROR_IDS.NORMAL_NO_STONE_FROM, 'No stone at from position', 400);
          if (err) return err;
          return NextResponse.json({ error: 'No stone at from position' }, { status: 400 });
        }
        if (newBoardState[toY][toX] !== null) {
          const err = await errorResponse(ERROR_IDS.NORMAL_TO_OCCUPIED, 'To position is occupied', 400);
          if (err) return err;
          return NextResponse.json({ error: 'To position is occupied' }, { status: 400 });
        }

        // Check if moving to the new position would be suicide
        // First simulate removing the stone from its current position
        const testBoard = newBoardState.map(row => [...row]);
        testBoard[fromY][fromX] = null;
        if (wouldBeSuicide(testBoard, toX, toY, stone as 0 | 1)) {
          const err = await errorResponse(ERROR_IDS.NORMAL_MOVE_SUICIDE, 'Cannot move stone to position with no liberties unless it captures', 400);
          if (err) return err;
          return NextResponse.json({ error: 'Cannot move stone to position with no liberties unless it captures' }, { status: 400 });
        }

        // Move the stone
        newBoardState[fromY][fromX] = null;
        newBoardState[toY][toX] = stone;
        break;
      }

      default: {
        const err = await errorResponse(ERROR_IDS.NORMAL_INVALID_ACTION, 'Invalid action type', 400);
        if (err) return err;
        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
      }
    }

    // After place or move, check for captures
    if (actionType === 'place' || actionType === 'move') {
      const placedX = toX as number;
      const placedY = toY as number;
      const captureResult = detectAndRemoveCaptures(newBoardState, placedX, placedY);
      newBoardState = captureResult.newBoard;

      // Update captured counts and onBoard counts
      // blackCaptured = number of BLACK stones captured → goes to WHITE's captured count
      // whiteCaptured = number of WHITE stones captured → goes to BLACK's captured count
      if (captureResult.blackCaptured > 0) {
        newWhiteCaptured += captureResult.blackCaptured;  // White captured black stones
        newBlackOnBoard -= captureResult.blackCaptured;   // Black has fewer on board
      }
      if (captureResult.whiteCaptured > 0) {
        newBlackCaptured += captureResult.whiteCaptured;  // Black captured white stones
        newWhiteOnBoard -= captureResult.whiteCaptured;   // White has fewer on board
      }

      // Update Ko point if a Ko situation was created
      if (captureResult.koPoint) {
        newKoPointX = captureResult.koPoint.x;
        newKoPointY = captureResult.koPoint.y;
      }
    }

    // Log the action
    await db.insert(actions).values({
      id: crypto.randomUUID(),
      gameId,
      actionType,
      stoneColor: stoneColor ?? null,
      fromX: fromX ?? null,
      fromY: fromY ?? null,
      toX: toX ?? null,
      toY: toY ?? null,
    });

    // Update the board
    await db.update(games).set({
      boardState: newBoardState,
      blackPotCount: newBlackPotCount,
      whitePotCount: newWhitePotCount,
      blackCaptured: newBlackCaptured,
      whiteCaptured: newWhiteCaptured,
      blackOnBoard: newBlackOnBoard,
      whiteOnBoard: newWhiteOnBoard,
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
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
      lastMoveX: newLastMoveX,
      lastMoveY: newLastMoveY,
      koPointX: newKoPointX,
      koPointY: newKoPointY,
    });
  } catch (error) {
    console.error('Error performing action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
