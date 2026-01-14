import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

// Games table - shared board that anyone with the key can access
export const games = pgTable('games', {
  id: text('id').primaryKey(), // UUID
  publicKey: text('public_key').notNull(), // JWK format public key for verification
  boardSize: integer('board_size').notNull().default(19), // 9, 13, or 19
  boardState: jsonb('board_state').notNull().$type<(number | null)[][]>(), // 2D array: null=empty, 0=black, 1=white
  // Track stones in pots (unlimited supply, but we track for display)
  blackPotCount: integer('black_pot_count').notNull().default(181), // Standard 19x19 has 181 black stones
  whitePotCount: integer('white_pot_count').notNull().default(180), // Standard 19x19 has 180 white stones
  blackReturned: integer('black_returned').notNull().default(0), // Black stones returned from board
  whiteReturned: integer('white_returned').notNull().default(0), // White stones returned from board
  lastMoveX: integer('last_move_x'), // X position of last placed stone
  lastMoveY: integer('last_move_y'), // Y position of last placed stone
  koPointX: integer('ko_point_x'), // X position of Ko point (cannot play here next)
  koPointY: integer('ko_point_y'), // Y position of Ko point (cannot play here next)
  connectedUsers: integer('connected_users').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

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
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;
