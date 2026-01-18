import { db } from '@/lib/db';
import { errorToggles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Cache for error toggles (refreshed every 60 seconds)
let toggleCache: Map<string, boolean> = new Map();
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 60 seconds - reduced DB queries while still allowing admin changes

async function refreshCache() {
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_TTL) {
    return;
  }

  try {
    const toggles = await db.select().from(errorToggles);
    toggleCache = new Map(toggles.map(t => [t.id, t.enabled]));
    lastCacheUpdate = now;
  } catch (error) {
    console.error('Failed to refresh error toggle cache:', error);
  }
}

/**
 * Check if an error is enabled. Returns true if enabled or not found in DB (default).
 */
export async function isErrorEnabled(errorId: string): Promise<boolean> {
  await refreshCache();
  const enabled = toggleCache.get(errorId);
  return enabled !== false; // Default to true if not found
}

/**
 * Helper to conditionally return an error response.
 * If the error is disabled, returns null (skip the error).
 * If enabled, returns the NextResponse error.
 */
export async function errorResponse(
  errorId: string,
  message: string,
  status: number = 400
): Promise<NextResponse | null> {
  const enabled = await isErrorEnabled(errorId);
  if (!enabled) {
    return null; // Skip this error
  }
  return NextResponse.json({ error: message }, { status });
}

// Error ID constants for type safety
export const ERROR_IDS = {
  // Normal Go
  NORMAL_PRIVATE_KEY_REQUIRED: 'normal_private_key_required',
  NORMAL_GAME_NOT_FOUND: 'normal_game_not_found',
  NORMAL_INVALID_PRIVATE_KEY: 'normal_invalid_private_key',
  NORMAL_INVALID_BOARD_SIZE: 'normal_invalid_board_size',
  NORMAL_INVALID_STONE_COLOR: 'normal_invalid_stone_color',
  NORMAL_INVALID_POSITION: 'normal_invalid_position',
  NORMAL_POSITION_OUT_OF_BOUNDS: 'normal_position_out_of_bounds',
  NORMAL_POSITION_OCCUPIED: 'normal_position_occupied',
  NORMAL_NO_BLACK_STONES: 'normal_no_black_stones',
  NORMAL_NO_WHITE_STONES: 'normal_no_white_stones',
  NORMAL_SUICIDE_NOT_ALLOWED: 'normal_suicide_not_allowed',
  NORMAL_KO_VIOLATION: 'normal_ko_violation',
  NORMAL_NO_STONE_AT_POSITION: 'normal_no_stone_at_position',
  NORMAL_INVALID_FROM_POSITION: 'normal_invalid_from_position',
  NORMAL_INVALID_TO_POSITION: 'normal_invalid_to_position',
  NORMAL_FROM_OUT_OF_BOUNDS: 'normal_from_out_of_bounds',
  NORMAL_TO_OUT_OF_BOUNDS: 'normal_to_out_of_bounds',
  NORMAL_SAME_POSITION: 'normal_same_position',
  NORMAL_NO_STONE_FROM: 'normal_no_stone_from',
  NORMAL_TO_OCCUPIED: 'normal_to_occupied',
  NORMAL_MOVE_SUICIDE: 'normal_move_suicide',
  NORMAL_INVALID_ACTION: 'normal_invalid_action',
  NORMAL_NO_MOVES_UNDO: 'normal_no_moves_undo',

  // Crazy Go
  CRAZY_PRIVATE_KEY_REQUIRED: 'crazy_private_key_required',
  CRAZY_GAME_NOT_FOUND: 'crazy_game_not_found',
  CRAZY_INVALID_PRIVATE_KEY: 'crazy_invalid_private_key',
  CRAZY_INVALID_BOARD_SIZE: 'crazy_invalid_board_size',
  CRAZY_INVALID_STONE_COLOR: 'crazy_invalid_stone_color',
  CRAZY_NOT_YOUR_TURN: 'crazy_not_your_turn',
  CRAZY_INVALID_POSITION: 'crazy_invalid_position',
  CRAZY_POSITION_OUT_OF_BOUNDS: 'crazy_position_out_of_bounds',
  CRAZY_POSITION_OCCUPIED: 'crazy_position_occupied',
  CRAZY_NO_STONES_IN_POT: 'crazy_no_stones_in_pot',
  CRAZY_SUICIDE_NOT_ALLOWED: 'crazy_suicide_not_allowed',
  CRAZY_KO_VIOLATION: 'crazy_ko_violation',
  CRAZY_NO_STONE_AT_POSITION: 'crazy_no_stone_at_position',
  CRAZY_INVALID_FROM_POSITION: 'crazy_invalid_from_position',
  CRAZY_INVALID_TO_POSITION: 'crazy_invalid_to_position',
  CRAZY_FROM_OUT_OF_BOUNDS: 'crazy_from_out_of_bounds',
  CRAZY_TO_OUT_OF_BOUNDS: 'crazy_to_out_of_bounds',
  CRAZY_SAME_POSITION: 'crazy_same_position',
  CRAZY_NO_STONE_FROM: 'crazy_no_stone_from',
  CRAZY_TO_OCCUPIED: 'crazy_to_occupied',
  CRAZY_INVALID_ACTION: 'crazy_invalid_action',
  CRAZY_NO_MOVES_UNDO: 'crazy_no_moves_undo',
  CRAZY_NO_MOVES_REPLAY: 'crazy_no_moves_replay',

  // Wilde Go
  WILDE_PRIVATE_KEY_REQUIRED: 'wilde_private_key_required',
  WILDE_GAME_NOT_FOUND: 'wilde_game_not_found',
  WILDE_INVALID_PRIVATE_KEY: 'wilde_invalid_private_key',
  WILDE_INVALID_DIMENSIONS: 'wilde_invalid_dimensions',
  WILDE_INVALID_PLAYER_COUNT: 'wilde_invalid_player_count',
  WILDE_INVALID_STONE_COLOR: 'wilde_invalid_stone_color',
  WILDE_INVALID_MOVE: 'wilde_invalid_move',
  WILDE_INVALID_POSITION: 'wilde_invalid_position',
  WILDE_POSITION_OUT_OF_BOUNDS: 'wilde_position_out_of_bounds',
  WILDE_POSITION_OCCUPIED: 'wilde_position_occupied',
  WILDE_NO_STONES_IN_POT: 'wilde_no_stones_in_pot',
  WILDE_SUICIDE_NOT_ALLOWED: 'wilde_suicide_not_allowed',
  WILDE_KO_VIOLATION: 'wilde_ko_violation',
  WILDE_NO_STONE_AT_POSITION: 'wilde_no_stone_at_position',
  WILDE_INVALID_FROM_POSITION: 'wilde_invalid_from_position',
  WILDE_INVALID_TO_POSITION: 'wilde_invalid_to_position',
  WILDE_FROM_OUT_OF_BOUNDS: 'wilde_from_out_of_bounds',
  WILDE_TO_OUT_OF_BOUNDS: 'wilde_to_out_of_bounds',
  WILDE_SAME_POSITION: 'wilde_same_position',
  WILDE_NO_STONE_FROM: 'wilde_no_stone_from',
  WILDE_TO_OCCUPIED: 'wilde_to_occupied',
  WILDE_INVALID_ACTION: 'wilde_invalid_action',
  WILDE_UNKNOWN_ACTION: 'wilde_unknown_action',
  WILDE_NO_MOVES_UNDO: 'wilde_no_moves_undo',
  WILDE_NO_MOVES_REPLAY: 'wilde_no_moves_replay',

  // Zen Go
  ZEN_PRIVATE_KEY_REQUIRED: 'zen_private_key_required',
  ZEN_GAME_NOT_FOUND: 'zen_game_not_found',
  ZEN_INVALID_PRIVATE_KEY: 'zen_invalid_private_key',
  ZEN_INVALID_BOARD_SIZE: 'zen_invalid_board_size',
  ZEN_INVALID_STONE_COLOR: 'zen_invalid_stone_color',
  ZEN_NOT_YOUR_TURN: 'zen_not_your_turn',
  ZEN_INVALID_POSITION: 'zen_invalid_position',
  ZEN_POSITION_OUT_OF_BOUNDS: 'zen_position_out_of_bounds',
  ZEN_POSITION_OCCUPIED: 'zen_position_occupied',
  ZEN_NO_STONES_IN_POT: 'zen_no_stones_in_pot',
  ZEN_SUICIDE_NOT_ALLOWED: 'zen_suicide_not_allowed',
  ZEN_KO_VIOLATION: 'zen_ko_violation',
  ZEN_NO_STONE_AT_POSITION: 'zen_no_stone_at_position',
  ZEN_INVALID_FROM_POSITION: 'zen_invalid_from_position',
  ZEN_INVALID_TO_POSITION: 'zen_invalid_to_position',
  ZEN_FROM_OUT_OF_BOUNDS: 'zen_from_out_of_bounds',
  ZEN_TO_OUT_OF_BOUNDS: 'zen_to_out_of_bounds',
  ZEN_SAME_POSITION: 'zen_same_position',
  ZEN_NO_STONE_FROM: 'zen_no_stone_from',
  ZEN_TO_OCCUPIED: 'zen_to_occupied',
  ZEN_INVALID_ACTION: 'zen_invalid_action',
  ZEN_NO_MOVES_UNDO: 'zen_no_moves_undo',
  ZEN_NO_MOVES_REPLAY: 'zen_no_moves_replay',
} as const;
