import "server-only";

import { tool, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import postgres, { type Sql } from "postgres";
import { toStreamResponse } from "./shared";
import { createDatabaseToolLoopAgent } from "./database_agent_model";
import { coerceTabularFilePartsToText } from "./coerce-tabular-file-parts";
import {
  assertReadonlySqlInput,
  MAX_ROWS,
  STMT_TIMEOUT_MS,
} from "./sql_readonly";
import {
  DATABASE_CHOICES,
  DATABASE_TARGET_IDS,
  type DatabaseTargetId,
} from "./database-constants";
import { getNameAndDdlForTarget } from "./database_schemas";

const PSQL_URL1 = process.env.DATABASE_URL1;
const PSQL_URL2 = process.env.DATABASE_URL2;

type SqlResultRow = Record<string, unknown>;

function getSqlClient(connectionString: string | undefined): Sql {
  if (!connectionString) {
    throw new Error(
      "Database connection is not configured (missing DATABASE_URL).",
    );
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

export function createSqlQueryTool(id: DatabaseTargetId) {
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

function getSchemaAndName(id: DatabaseTargetId): {
  name: string;
  schemaDdl: string;
  url: string | undefined;
} {
  const { name, schemaDdl } = getNameAndDdlForTarget(id);
  const url = id === "1" ? PSQL_URL1 : PSQL_URL2;
  return { name, schemaDdl, url };
}

export function getDatabaseAgent(target: DatabaseTargetId) {
  const { name, schemaDdl, url } = getSchemaAndName(target);
  if (!url) {
    return null;
  }

  const sqlQuery = createSqlQueryTool(target);

  return createDatabaseToolLoopAgent(name, schemaDdl, sqlQuery);
}

export type DatabaseToolLoopAgent = NonNullable<
  ReturnType<typeof getDatabaseAgent>
>;

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  database: z.enum(DATABASE_TARGET_IDS).default("1"),
});

export async function handleDatabaseAgentRequest(
  req: Request,
): Promise<Response> {
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
    const forModel = await coerceTabularFilePartsToText(
      messages as UIMessage[],
    );
    const result = await agent.stream({
      messages: await convertToModelMessages(forModel),
    });
    return toStreamResponse(result);
  } catch (e) {
    console.error("[database-agent] Error:", e);
    return new Response(
      JSON.stringify({ error: "Database agent request failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
