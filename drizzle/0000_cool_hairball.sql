CREATE TABLE "actions" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"action_type" text NOT NULL,
	"stone_color" integer,
	"from_x" integer,
	"from_y" integer,
	"to_x" integer,
	"to_y" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"board_size" integer DEFAULT 19 NOT NULL,
	"board_state" jsonb NOT NULL,
	"black_pot_count" integer DEFAULT 181 NOT NULL,
	"white_pot_count" integer DEFAULT 180 NOT NULL,
	"black_returned" integer DEFAULT 0 NOT NULL,
	"white_returned" integer DEFAULT 0 NOT NULL,
	"last_move_x" integer,
	"last_move_y" integer,
	"connected_users" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;