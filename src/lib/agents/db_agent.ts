import "server-only";

import { tool, convertToModelMessages, ToolLoopAgent } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import postgres, { type Sql } from "postgres";
import {
  AGENT_INDIAN_LOCALE_HINT,
  AGENT_MARKDOWN_MATH_HINT,
  AGENT_MODEL,
  AGENT_STOP_WHEN,
  codeInterpreterTool,
  toStreamResponse,
  webSearchTool,
} from "./shared";
import {
  DATABASE_CHOICES,
  DATABASE_TARGET_IDS,
  type DatabaseTargetId,
} from "./database-constants";

const PSQL_URL1 = process.env.DATABASE_URL1;
const PSQL_SCHEMA1 = `
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
const PSQL_URL2 = process.env.DATABASE_URL2;
const PSQL_SCHEMA2 = `
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
const MAX_ROWS = 500;
const STMT_TIMEOUT_MS = 10_000;

/**
 * Heuristic + PostgreSQL enforces the rest via default_transaction_read_only in-session.
 */
function assertReadonlySqlInput(sql: string): string {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!stripped) {
    throw new Error("Empty SQL is not allowed.");
  }
  const one = stripped.replace(/;+\s*$/g, "");
  if (one.includes(";")) {
    throw new Error("Only a single statement is allowed (no multiple queries).");
  }
  if (!/^(SELECT|WITH)\b/i.test(one)) {
    throw new Error("Only SELECT or WITH (CTEs leading to a read) are allowed — no DML/DDL.");
  }
  if (/\b(INSERT|UPDATE|DELETE|TRUNCATE|GRANT|REVOKE|ALTER|CREATE|DROP|VACUUM|COPY)\b/i.test(one)) {
    throw new Error("That statement contains a forbidden SQL keyword for read-only use.");
  }
  return one;
}

type SqlResultRow = Record<string, unknown>;

function getSqlClient(connectionString: string | undefined): Sql {
  if (!connectionString) {
    throw new Error("Database connection is not configured (missing DATABASE_URL).");
  }
  return postgres(connectionString, {
    max: 1,
    connect_timeout: 15,
    prepare: true,
  });
}

const sqlClientCache: Partial<Record<DatabaseTargetId, Sql>> = {};

function getCachedSqlForTarget(id: DatabaseTargetId): Sql {
  const url = id === "1" ? PSQL_URL1 : PSQL_URL2;
  if (sqlClientCache[id]) {
    return sqlClientCache[id]!;
  }
  const c = getSqlClient(url);
  sqlClientCache[id] = c;
  return c;
}

export function createSqlQueryTool(
  id: DatabaseTargetId,
) {
  const label = DATABASE_CHOICES[id].name;

  return tool({
    description: `Run exactly ONE read-only PostgreSQL query on "${label}". The connection is in read-only transaction mode. Returns up to ${MAX_ROWS} rows (JSON). Use only to answer questions with real data. Prefer this over guessing.`,
    inputSchema: z.object({
      sql: z
        .string()
        .min(1)
        .max(24_000)
        .describe("Single SELECT or WITH...SELECT statement only."),
    }),
    async execute({ sql }) {
      const sqlText = assertReadonlySqlInput(sql);
      const sqlc = getCachedSqlForTarget(id);
      const all = await sqlc.begin(async (tx) => {
        await tx.unsafe("SET LOCAL default_transaction_read_only = on");
        await tx.unsafe(`SET LOCAL statement_timeout = ${STMT_TIMEOUT_MS}`);
        const r = await tx.unsafe<SqlResultRow[]>(sqlText);
        return Array.isArray(r) ? r : [];
      });
      const truncated = all.length > MAX_ROWS;
      return {
        rowCount: Math.min(all.length, MAX_ROWS),
        truncated,
        rows: all.slice(0, MAX_ROWS),
      };
    },
  });
}

function getSchemaAndName(
  id: DatabaseTargetId,
): { name: string; schemaDdl: string; url: string | undefined } {
  const name = DATABASE_CHOICES[id].name;
  if (id === "1") {
    return { name, schemaDdl: PSQL_SCHEMA1, url: PSQL_URL1 };
  }
  return { name, schemaDdl: PSQL_SCHEMA2, url: PSQL_URL2 };
}

export function getDatabaseAgent(target: DatabaseTargetId) {
  const { name, schemaDdl, url } = getSchemaAndName(target);
  if (!url) {
    return null;
  }

  const sqlQuery = createSqlQueryTool(target);

  return new ToolLoopAgent({
    model: AGENT_MODEL,
    stopWhen: AGENT_STOP_WHEN,
    instructions: `You are an expert database engineer and SQL analyst (PostgreSQL).

**Active database (read-only):** "${name}".
You can run SELECT / WITH queries using the sqlQuery tool — one statement per call. The server enforces a read-only transaction, statement timeout, and a row cap. Do not attempt INSERT, UPDATE, DELETE, DDL, or admin commands.

**Schema (reference):**
\`\`\`sql
${schemaDdl.trim()}
\`\`\`

**PostgreSQL capabilities to use (read-only):**
- **Joins:** inner, left / right / full outer, cross, self-joins, LATERAL joins, multiple tables, join conditions in ON and WHERE.
- **Complex queries:** CTEs (WITH), subqueries (scalar, IN, EXISTS, correlated), semi/anti-joins, set ops (UNION/INTERSECT/EXCEPT) when they keep the statement a single read.
- **Filters & sorts:** rich WHERE (including NULL-safe, ranges, IN lists), HAVING, ORDER BY, LIMIT/OFFSET, DISTINCT, DISTINCT ON where appropriate.
- **Aggregations:** GROUP BY, ROLLUP/CUBE/GROUPING SETS, aggregate functions, FILTER (WHERE …), and window functions (OVER, PARTITION BY) for running totals, ranks, percentiles, etc.
- **Multistep reasoning:** decompose the user’s request into sub-questions, run more than one sqlQuery when useful (e.g. explore keys → then join and aggregate), refine based on each result, and only then explain conclusions.

Guidelines:
1. Map questions to the correct relations: choose keys, join paths, and filters before writing SQL.
2. Use webSearch if you need PostgreSQL syntax, performance notes, or domain knowledge.
3. Use sqlQuery to fetch real data; write clear SQL, document assumptions, and handle NULLs and duplicates.
4. Prefer correct, well-scoped queries; use several smaller queries over one brittle statement when that improves clarity.
5. Use codeInterpreter only for non-SQL work (e.g. formatting math); prefer sqlQuery for all database reads.

6. The sqlQuery tool may only receive a single SELECT (or WITH...SELECT) — no semicolons in the middle.
7. For privacy, avoid selecting sensitive columns unless the user needs them; still respect their question.

${AGENT_INDIAN_LOCALE_HINT}

${AGENT_MARKDOWN_MATH_HINT}`,
    tools: {
      webSearch: webSearchTool,
      codeInterpreter: codeInterpreterTool,
      sqlQuery,
    },
  });
}

export type DatabaseToolLoopAgent = NonNullable<ReturnType<typeof getDatabaseAgent>>;

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  database: z.enum(DATABASE_TARGET_IDS).default("1"),
});

export async function handleDatabaseAgentRequest(req: Request): Promise<Response> {
  try {
    const json = (await req.json()) as unknown;
    const { messages, database } = bodySchema.parse(json);
    const agent = getDatabaseAgent(database);
    if (!agent) {
      return new Response(
        JSON.stringify({
          error: `Database ${database} is not configured. Set ${database === "1" ? "DATABASE_URL1" : "DATABASE_URL2"}.`,
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    const result = await agent.stream({
      messages: await convertToModelMessages(messages as UIMessage[]),
    });
    return toStreamResponse(result);
  } catch (e) {
    console.error("[database-agent] Error:", e);
    return new Response(JSON.stringify({ error: "Database agent request failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
