import { NextRequest, NextResponse } from 'next/server';
import { db, games, actions } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyKeyPair } from '@/lib/crypto/keys';
import type { Board, Stone } from '@/lib/game/logic';
import { detectAndRemoveCaptures, wouldBeSuicide } from '@/lib/game/logic';

// POST /api/games/[gameId]/action - Perform an action on the board
// Actions: place (from pot to board), remove (from board to pot), move (on board)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { privateKey, actionType, stoneColor, fromX, fromY, toX, toY } = body;

    if (!privateKey) {
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
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify the private key
    const isValid = await verifyKeyPair(game[0].publicKey, privateKey);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid private key' },
        { status: 401 }
      );
    }

    const boardState = game[0].boardState as Board;
    const boardSize = game[0].boardSize;
    let newBoardState = boardState.map(row => [...row]);
    let newBlackPotCount = game[0].blackPotCount;
    let newWhitePotCount = game[0].whitePotCount;
    let newBlackReturned = game[0].blackReturned;
    let newWhiteReturned = game[0].whiteReturned;
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

        // Check pot has stones (either original or returned)
        const totalBlack = newBlackPotCount + newBlackReturned;
        const totalWhite = newWhitePotCount + newWhiteReturned;

        if (stoneColor === 0 && totalBlack <= 0) {
          return NextResponse.json({ error: 'No black stones in pot' }, { status: 400 });
        }
        if (stoneColor === 1 && totalWhite <= 0) {
          return NextResponse.json({ error: 'No white stones in pot' }, { status: 400 });
        }

        // Check if this would be suicide (no liberties and doesn't capture)
        if (wouldBeSuicide(newBoardState, toX, toY, stoneColor as 0 | 1)) {
          return NextResponse.json({ error: 'Cannot place stone with no liberties unless it captures' }, { status: 400 });
        }

        // Check Ko rule - cannot play on Ko point
        if (currentKoPointX !== null && currentKoPointY !== null && toX === currentKoPointX && toY === currentKoPointY) {
          return NextResponse.json({ error: 'Ko rule violation - cannot recapture immediately' }, { status: 400 });
        }

        // Place the stone - use returned stones first, then original
        newBoardState[toY][toX] = stoneColor as Stone;
        if (stoneColor === 0) {
          if (newBlackReturned > 0) newBlackReturned--;
          else newBlackPotCount--;
        } else {
          if (newWhiteReturned > 0) newWhiteReturned--;
          else newWhitePotCount--;
        }
        // Track this as the last move
        newLastMoveX = toX;
        newLastMoveY = toY;
        break;
      }

      case 'remove': {
        // Remove a stone from board to returned pile
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

        // Remove the stone and add to returned pile
        newBoardState[fromY][fromX] = null;
        if (stone === 0) newBlackReturned++;
        else newWhiteReturned++;
        break;
      }

      case 'move': {
        // Move a stone on the board
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

        // Check if moving to the new position would be suicide
        // First simulate removing the stone from its current position
        const testBoard = newBoardState.map(row => [...row]);
        testBoard[fromY][fromX] = null;
        if (wouldBeSuicide(testBoard, toX, toY, stone as 0 | 1)) {
          return NextResponse.json({ error: 'Cannot move stone to position with no liberties unless it captures' }, { status: 400 });
        }

        // Move the stone
        newBoardState[fromY][fromX] = null;
        newBoardState[toY][toX] = stone;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    // After place or move, check for captures
    if (actionType === 'place' || actionType === 'move') {
      const placedX = toX as number;
      const placedY = toY as number;
      const captureResult = detectAndRemoveCaptures(newBoardState, placedX, placedY);
      newBoardState = captureResult.newBoard;

      // Add captured stones to returned piles
      newBlackReturned += captureResult.blackCaptured;
      newWhiteReturned += captureResult.whiteCaptured;

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
      blackReturned: newBlackReturned,
      whiteReturned: newWhiteReturned,
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
      blackReturned: newBlackReturned,
      whiteReturned: newWhiteReturned,
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
