import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { errorToggles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// All error definitions with their keys and messages
export const ALL_ERRORS = {
  normal: [
    { id: 'normal_private_key_required', message: 'Private key is required' },
    { id: 'normal_game_not_found', message: 'Game not found' },
    { id: 'normal_invalid_private_key', message: 'Invalid private key' },
    { id: 'normal_invalid_board_size', message: 'Invalid board size. Must be 9, 13, or 19.' },
    { id: 'normal_invalid_stone_color', message: 'Invalid stone color' },
    { id: 'normal_invalid_position', message: 'Invalid position' },
    { id: 'normal_position_out_of_bounds', message: 'Position out of bounds' },
    { id: 'normal_position_occupied', message: 'Position is occupied' },
    { id: 'normal_no_black_stones', message: 'No black stones in pot' },
    { id: 'normal_no_white_stones', message: 'No white stones in pot' },
    { id: 'normal_suicide_not_allowed', message: 'Cannot place stone with no liberties unless it captures' },
    { id: 'normal_ko_violation', message: 'Ko rule violation - cannot recapture immediately' },
    { id: 'normal_no_stone_at_position', message: 'No stone at position' },
    { id: 'normal_invalid_from_position', message: 'Invalid from position' },
    { id: 'normal_invalid_to_position', message: 'Invalid to position' },
    { id: 'normal_from_out_of_bounds', message: 'From position out of bounds' },
    { id: 'normal_to_out_of_bounds', message: 'To position out of bounds' },
    { id: 'normal_same_position', message: 'Cannot move to same position' },
    { id: 'normal_no_stone_from', message: 'No stone at from position' },
    { id: 'normal_to_occupied', message: 'To position is occupied' },
    { id: 'normal_move_suicide', message: 'Cannot move stone to position with no liberties unless it captures' },
    { id: 'normal_invalid_action', message: 'Invalid action type' },
    { id: 'normal_no_moves_undo', message: 'No moves to undo' },
  ],
  crazy: [
    { id: 'crazy_private_key_required', message: 'Private key is required' },
    { id: 'crazy_game_not_found', message: 'Game not found' },
    { id: 'crazy_invalid_private_key', message: 'Invalid private key' },
    { id: 'crazy_invalid_board_size', message: 'Invalid board size. Must be 9, 13, or 19.' },
    { id: 'crazy_invalid_stone_color', message: 'Invalid stone color' },
    { id: 'crazy_not_your_turn', message: 'Not your turn' },
    { id: 'crazy_invalid_position', message: 'Invalid position' },
    { id: 'crazy_position_out_of_bounds', message: 'Position out of bounds' },
    { id: 'crazy_position_occupied', message: 'Position is occupied' },
    { id: 'crazy_no_stones_in_pot', message: 'No stones of this color in pot' },
    { id: 'crazy_suicide_not_allowed', message: 'Suicide move not allowed' },
    { id: 'crazy_ko_violation', message: 'Ko rule violation' },
    { id: 'crazy_no_stone_at_position', message: 'No stone at position' },
    { id: 'crazy_invalid_from_position', message: 'Invalid from position' },
    { id: 'crazy_invalid_to_position', message: 'Invalid to position' },
    { id: 'crazy_from_out_of_bounds', message: 'From position out of bounds' },
    { id: 'crazy_to_out_of_bounds', message: 'To position out of bounds' },
    { id: 'crazy_same_position', message: 'Cannot move to same position' },
    { id: 'crazy_no_stone_from', message: 'No stone at from position' },
    { id: 'crazy_to_occupied', message: 'To position is occupied' },
    { id: 'crazy_invalid_action', message: 'Invalid action type' },
    { id: 'crazy_no_moves_undo', message: 'No moves to undo' },
    { id: 'crazy_no_moves_replay', message: 'No moves to replay' },
  ],
  wilde: [
    { id: 'wilde_private_key_required', message: 'Private key is required' },
    { id: 'wilde_game_not_found', message: 'Game not found' },
    { id: 'wilde_invalid_private_key', message: 'Invalid private key' },
    { id: 'wilde_invalid_dimensions', message: 'Invalid board dimensions. Width and height must be 3-20.' },
    { id: 'wilde_invalid_player_count', message: 'Invalid player count. Must be 2-8 players.' },
    { id: 'wilde_invalid_stone_color', message: 'Invalid stone color' },
    { id: 'wilde_invalid_move', message: 'Invalid move' },
    { id: 'wilde_invalid_position', message: 'Invalid position' },
    { id: 'wilde_position_out_of_bounds', message: 'Position out of bounds' },
    { id: 'wilde_position_occupied', message: 'Position is occupied' },
    { id: 'wilde_no_stones_in_pot', message: 'No stones of this color in pot' },
    { id: 'wilde_suicide_not_allowed', message: 'Suicide move not allowed' },
    { id: 'wilde_ko_violation', message: 'Ko rule violation' },
    { id: 'wilde_no_stone_at_position', message: 'No stone at position' },
    { id: 'wilde_invalid_from_position', message: 'Invalid from position' },
    { id: 'wilde_invalid_to_position', message: 'Invalid to position' },
    { id: 'wilde_from_out_of_bounds', message: 'From position out of bounds' },
    { id: 'wilde_to_out_of_bounds', message: 'To position out of bounds' },
    { id: 'wilde_same_position', message: 'Cannot move to same position' },
    { id: 'wilde_no_stone_from', message: 'No stone at from position' },
    { id: 'wilde_to_occupied', message: 'To position is occupied' },
    { id: 'wilde_invalid_action', message: 'Invalid action type' },
    { id: 'wilde_unknown_action', message: 'Unknown action type' },
    { id: 'wilde_no_moves_undo', message: 'No moves to undo' },
    { id: 'wilde_no_moves_replay', message: 'No moves to replay' },
  ],
};

// GET /api/admin/errors - Get all error toggles
export async function GET() {
  try {
    // Get existing toggles from database
    const existingToggles = await db.select().from(errorToggles);
    const toggleMap = new Map(existingToggles.map(t => [t.id, t]));

    // Build response with all errors, using DB values or defaults
    const result: Record<string, Array<{ id: string; message: string; enabled: boolean }>> = {};

    for (const [gameType, errors] of Object.entries(ALL_ERRORS)) {
      result[gameType] = errors.map(error => {
        const existing = toggleMap.get(error.id);
        return {
          id: error.id,
          message: error.message,
          enabled: existing ? existing.enabled : true,
        };
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching error toggles:', error);
    return NextResponse.json({ error: 'Failed to fetch error toggles' }, { status: 500 });
  }
}

// POST /api/admin/errors - Update error toggle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled } = body;

    if (typeof id !== 'string' || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Find the error definition
    let gameType: string | null = null;
    let errorMessage: string | null = null;

    for (const [type, errors] of Object.entries(ALL_ERRORS)) {
      const found = errors.find(e => e.id === id);
      if (found) {
        gameType = type;
        errorMessage = found.message;
        break;
      }
    }

    if (!gameType || !errorMessage) {
      return NextResponse.json({ error: 'Error not found' }, { status: 404 });
    }

    // Upsert the toggle
    await db
      .insert(errorToggles)
      .values({
        id,
        gameType,
        errorMessage,
        enabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: errorToggles.id,
        set: {
          enabled,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true, id, enabled });
  } catch (error) {
    console.error('Error updating error toggle:', error);
    return NextResponse.json({ error: 'Failed to update error toggle' }, { status: 500 });
  }
}

// PUT /api/admin/errors - Bulk update (enable/disable all)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, gameType } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Get errors to update
    const errorsToUpdate = gameType && gameType !== 'all'
      ? ALL_ERRORS[gameType as keyof typeof ALL_ERRORS] || []
      : Object.values(ALL_ERRORS).flat();

    // Upsert all toggles
    for (const error of errorsToUpdate) {
      const type = Object.entries(ALL_ERRORS).find(([, errors]) =>
        errors.some(e => e.id === error.id)
      )?.[0] || 'normal';

      await db
        .insert(errorToggles)
        .values({
          id: error.id,
          gameType: type,
          errorMessage: error.message,
          enabled,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: errorToggles.id,
          set: {
            enabled,
            updatedAt: new Date(),
          },
        });
    }

    return NextResponse.json({ success: true, count: errorsToUpdate.length });
  } catch (error) {
    console.error('Error bulk updating error toggles:', error);
    return NextResponse.json({ error: 'Failed to bulk update error toggles' }, { status: 500 });
  }
}
