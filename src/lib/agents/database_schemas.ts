import { DATABASE_CHOICES, type DatabaseTargetId } from "./database-constants";

export const PSQL_SCHEMA1 = `
CREATE TYPE "public"."attachment_type" AS ENUM('link', 'youtube_video', 'youtube_playlist', 'youtube_embed');
CREATE TABLE "puzzle_game_schedules" (
        "id" serial PRIMARY KEY NOT NULL,
        "puzzle_id" integer NOT NULL,
        "start_time" timestamp with time zone NOT NULL,
        "end_time" timestamp with time zone NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone,
        "archival_verify_key" text,
        "notification_key" text
);

CREATE TABLE "puzzle_gameplay_sessions" (
        "id" serial PRIMARY KEY NOT NULL,
        "puzzle_id" integer NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "location" varchar(25),
        "script" text
);

CREATE TABLE "puzzle_gameplay_stats" (
        "id" serial PRIMARY KEY NOT NULL,
        "puzzle_id" integer NOT NULL,
        "session_id" integer NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "time_taken" integer NOT NULL,
        "accuracy" integer NOT NULL,
        "correct_attempts" integer NOT NULL,
        "total_attempts" integer NOT NULL
);

CREATE TABLE "word_puzzle_attachments" (
        "id" serial PRIMARY KEY NOT NULL,
        "puzzle_id" integer NOT NULL,
        "type" "attachment_type" NOT NULL,
        "url" text NOT NULL,
        "title" text,
        "order_index" smallint DEFAULT 1 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone
);

CREATE TABLE "word_puzzles" (
        "id" serial PRIMARY KEY NOT NULL,
        "uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone,
        "word_list" jsonb NOT NULL,
        "grid_data" jsonb NOT NULL,
        "grid_dimensions" jsonb NOT NULL,
        "archived" boolean DEFAULT false NOT NULL,
        "last_archived_at" timestamp with time zone,
        CONSTRAINT "word_puzzles_uuid_unique" UNIQUE("uuid")
);

ALTER TABLE "puzzle_game_schedules" ADD CONSTRAINT "puzzle_game_schedules_puzzle_id_word_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."word_puzzles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "puzzle_gameplay_sessions" ADD CONSTRAINT "puzzle_gameplay_sessions_puzzle_id_word_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."word_puzzles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "puzzle_gameplay_stats" ADD CONSTRAINT "puzzle_gameplay_stats_puzzle_id_word_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."word_puzzles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "puzzle_gameplay_stats" ADD CONSTRAINT "puzzle_gameplay_stats_session_id_puzzle_gameplay_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."puzzle_gameplay_sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "word_puzzle_attachments" ADD CONSTRAINT "word_puzzle_attachments_puzzle_id_word_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."word_puzzles"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "puzzle_game_schedules_start_time_end_time_idx" ON "puzzle_game_schedules" USING btree ("start_time","end_time");
CREATE INDEX "puzzle_game_schedules_end_time_idx" ON "puzzle_game_schedules" USING btree ("end_time");
CREATE INDEX "puzzle_game_schedules_puzzle_id_created_at_idx" ON "puzzle_game_schedules" USING btree ("puzzle_id","created_at");
CREATE INDEX "puzzle_game_schedules_created_at_idx" ON "puzzle_game_schedules" USING btree ("created_at");
CREATE INDEX "puzzle_gameplay_sessions_puzzle_id_created_at_idx" ON "puzzle_gameplay_sessions" USING btree ("puzzle_id","created_at");
CREATE INDEX "puzzle_gameplay_stats_puzzle_id_created_at_idx" ON "puzzle_gameplay_stats" USING btree ("puzzle_id","created_at");
CREATE UNIQUE INDEX "puzzle_gameplay_stats_session_id_idx" ON "puzzle_gameplay_stats" USING btree ("session_id");
CREATE INDEX "word_puzzle_attachments_puzzle_id_idx" ON "word_puzzle_attachments" USING btree ("puzzle_id");
CREATE UNIQUE INDEX "word_puzzles_uuid_idx" ON "word_puzzles" USING btree ("uuid");
CREATE INDEX "word_puzzles_archived_created_at_idx" ON "word_puzzles" USING btree ("archived","created_at");
CREATE INDEX "word_puzzles_archived_last_archived_at_idx" ON "word_puzzles" USING btree ("archived","last_archived_at");
`;

export const PSQL_SCHEMA2 = `
CREATE TYPE "public"."rent_type" AS ENUM('rent', 'electricity');
CREATE TABLE "others" (
        "key" varchar(20) PRIMARY KEY NOT NULL,
        "value" text NOT NULL
);

CREATE TABLE "rent_data" (
        "id" serial PRIMARY KEY NOT NULL,
        "amount" integer NOT NULL,
        "month" char(7) NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone NOT NULL,
        "date" date NOT NULL,
        "user_id" text NOT NULL,
        "rent_type" "rent_type" DEFAULT 'rent' NOT NULL,
        CONSTRAINT "rent_data_month_format_check" CHECK ("rent_data"."month" ~ '^[0-9]{4}-[0-9]{2}$')
);

CREATE TABLE "verification_requests" (
        "id" integer PRIMARY KEY NOT NULL
);

CREATE TABLE "account" (
        "id" text PRIMARY KEY NOT NULL,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "user_id" text NOT NULL,
        "access_token" text,
        "refresh_token" text,
        "id_token" text,
        "access_token_expires_at" timestamp,
        "refresh_token_expires_at" timestamp,
        "scope" text,
        "password" text,
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp NOT NULL
);

CREATE TABLE "user" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL,
        "email_verified" boolean NOT NULL,
        "image" text,
        "created_at" timestamp NOT NULL,
        "updated_at" timestamp NOT NULL,
        "username" text,
        "role" text,
        "banned" boolean,
        "ban_reason" text,
        "ban_expires" timestamp,
        "is_approved" boolean,
        CONSTRAINT "user_email_unique" UNIQUE("email"),
        CONSTRAINT "user_username_unique" UNIQUE("username")
);

CREATE TABLE "verification" (
        "id" text PRIMARY KEY NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp,
        "updated_at" timestamp
);

ALTER TABLE "rent_data" ADD CONSTRAINT "rent_data_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_id_rent_data_id_fk" FOREIGN KEY ("id") REFERENCES "public"."rent_data"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "rent_data_date_index" ON "rent_data" USING btree ("date");
CREATE INDEX "rent_data_month_index" ON "rent_data" USING btree ("month");
`;

export function getNameAndDdlForTarget(
  id: DatabaseTargetId,
): { name: string; schemaDdl: string } {
  const name = DATABASE_CHOICES[id].name;
  if (id === "1") {
    return { name, schemaDdl: PSQL_SCHEMA1 };
  }
  return { name, schemaDdl: PSQL_SCHEMA2 };
}
