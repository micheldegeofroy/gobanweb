import { pgTable, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

// Games table - shared board that anyone with the key can access
export const games = pgTable('games', {
  id: text('id').primaryKey(), // UUID
  publicKey: text('public_key').notNull(), // JWK format public key for verification
  boardSize: integer('board_size').notNull().default(19), // 9, 13, or 19
  boardState: jsonb('board_state').notNull().$type<(number | null)[][]>(), // 2D array: null=empty, 0=black, 1=white
  // Track stones in pots for scoring
  blackPotCount: integer('black_pot_count').notNull().default(181), // Black stones available in pot
  whitePotCount: integer('white_pot_count').notNull().default(180), // White stones available in pot
  blackCaptured: integer('black_captured').notNull().default(0), // White stones captured by black (Japanese scoring)
  whiteCaptured: integer('white_captured').notNull().default(0), // Black stones captured by white (Japanese scoring)
  blackOnBoard: integer('black_on_board').notNull().default(0), // Black stones on board (Chinese scoring)
  whiteOnBoard: integer('white_on_board').notNull().default(0), // White stones on board (Chinese scoring)
  lastMoveX: integer('last_move_x'), // X position of last placed stone
  lastMoveY: integer('last_move_y'), // Y position of last placed stone
  koPointX: integer('ko_point_x'), // X position of Ko point (cannot play here next)
  koPointY: integer('ko_point_y'), // Y position of Ko point (cannot play here next)
  connectedUsers: integer('connected_users').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Captured stone info for undo support
export interface CapturedStoneInfo {
  x: number;
  y: number;
  color: number;
}

// Actions log - for history/undo (optional)
export const actions = pgTable('actions', {
  id: text('id').primaryKey(), // UUID
  gameId: text('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  actionType: text('action_type').notNull(), // 'place', 'remove', 'move'
  stoneColor: integer('stone_color'), // 0=black, 1=white
  fromX: integer('from_x'),
  fromY: integer('from_y'),
  toX: integer('to_x'),
  toY: integer('to_y'),
  // For undo support: track captured stones and Ko point after this action
  capturedStones: jsonb('captured_stones').$type<CapturedStoneInfo[]>(),
  koPointX: integer('ko_point_x'),
  koPointY: integer('ko_point_y'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;

// Crazy Go games table - 4-player variant
export const crazyGames = pgTable('crazy_games', {
  id: text('id').primaryKey(), // UUID
  publicKey: text('public_key').notNull(), // JWK format public key for verification
  boardSize: integer('board_size').notNull().default(19), // 9, 13, or 19
  boardState: jsonb('board_state').notNull().$type<(number | null)[][]>(), // 2D array: null=empty, 0=black, 1=white, 2=brown, 3=grey
  // Track stones in pots for all 4 colors
  blackPotCount: integer('black_pot_count').notNull().default(91),
  whitePotCount: integer('white_pot_count').notNull().default(90),
  brownPotCount: integer('brown_pot_count').notNull().default(90),
  greyPotCount: integer('grey_pot_count').notNull().default(90),
  // Japanese scoring: count of opponent stones captured by each player
  blackCaptured: integer('black_captured').notNull().default(0),
  whiteCaptured: integer('white_captured').notNull().default(0),
  brownCaptured: integer('brown_captured').notNull().default(0),
  greyCaptured: integer('grey_captured').notNull().default(0),
  lastMoveX: integer('last_move_x'),
  lastMoveY: integer('last_move_y'),
  koPointX: integer('ko_point_x'),
  koPointY: integer('ko_point_y'),
  currentTurn: integer('current_turn').notNull().default(0), // 0=black, 1=white, 2=black-cross, 3=white-cross
  moveNumber: integer('move_number').notNull().default(0),
  connectedUsers: integer('connected_users').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type CrazyGame = typeof crazyGames.$inferSelect;
export type NewCrazyGame = typeof crazyGames.$inferInsert;

// Crazy Go actions log - for replay
export const crazyActions = pgTable('crazy_actions', {
  id: text('id').primaryKey(), // UUID
  gameId: text('game_id').notNull().references(() => crazyGames.id, { onDelete: 'cascade' }),
  actionType: text('action_type').notNull(), // 'place', 'remove', 'move'
  stoneColor: integer('stone_color'), // 0=black, 1=white, 2=brown, 3=grey
  fromX: integer('from_x'),
  fromY: integer('from_y'),
  toX: integer('to_x'),
  toY: integer('to_y'),
  moveNumber: integer('move_number').notNull(),
  // For undo support: track captured stones and Ko point after this action
  capturedStones: jsonb('captured_stones').$type<CapturedStoneInfo[]>(),
  koPointX: integer('ko_point_x'),
  koPointY: integer('ko_point_y'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type CrazyAction = typeof crazyActions.$inferSelect;
export type NewCrazyAction = typeof crazyActions.$inferInsert;

// Stone pot type for Wilde Go
// Tracks stones for both Japanese (territory + captured) and Chinese (territory + onBoard) scoring
export interface StonePot {
  potCount: number;   // Stones available to play from pot
  captured: number;   // Opponent stones this player has captured (Japanese scoring)
  onBoard: number;    // This player's stones currently on board (Chinese scoring)
}

// Wilde Go games table - 2-8 players, custom rectangular boards
export const wildeGames = pgTable('wilde_games', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  boardWidth: integer('board_width').notNull().default(19), // 3-20
  boardHeight: integer('board_height').notNull().default(19), // 3-20
  playerCount: integer('player_count').notNull().default(2), // 2-8
  boardState: jsonb('board_state').notNull().$type<(number | null)[][]>(),
  // Stone pots as JSON array: [{potCount, returned}, ...]
  stonePots: jsonb('stone_pots').notNull().$type<StonePot[]>(),
  lastMoveX: integer('last_move_x'),
  lastMoveY: integer('last_move_y'),
  koPointX: integer('ko_point_x'),
  koPointY: integer('ko_point_y'),
  currentTurn: integer('current_turn').notNull().default(0),
  moveNumber: integer('move_number').notNull().default(0),
  pacmanMode: boolean('pacman_mode').notNull().default(false), // Pacman chaos mode
  customHues: jsonb('custom_hues').$type<Record<number, number>>(), // Player index -> hue offset
  connectedUsers: integer('connected_users').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type WildeGame = typeof wildeGames.$inferSelect;
export type NewWildeGame = typeof wildeGames.$inferInsert;

// Wilde Go actions log - for replay
export const wildeActions = pgTable('wilde_actions', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => wildeGames.id, { onDelete: 'cascade' }),
  actionType: text('action_type').notNull(), // 'place', 'remove', 'move', 'pacman_eat'
  stoneColor: integer('stone_color'), // 0-7
  fromX: integer('from_x'),
  fromY: integer('from_y'),
  toX: integer('to_x'),
  toY: integer('to_y'),
  moveNumber: integer('move_number').notNull(),
  // For undo support: track captured stones and Ko point after this action
  capturedStones: jsonb('captured_stones').$type<CapturedStoneInfo[]>(),
  koPointX: integer('ko_point_x'),
  koPointY: integer('ko_point_y'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type WildeAction = typeof wildeActions.$inferSelect;
export type NewWildeAction = typeof wildeActions.$inferInsert;

// Error toggles for admin control
export const errorToggles = pgTable('error_toggles', {
  id: text('id').primaryKey(), // error key like "suicide_move_not_allowed"
  gameType: text('game_type').notNull(), // 'normal', 'crazy', 'wilde'
  errorMessage: text('error_message').notNull(), // The actual error message
  enabled: boolean('enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type ErrorToggle = typeof errorToggles.$inferSelect;
export type NewErrorToggle = typeof errorToggles.$inferInsert;
