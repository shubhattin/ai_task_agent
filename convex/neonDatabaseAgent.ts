import { neon } from "@neondatabase/serverless";
import { tool } from "ai";
import { z } from "zod";
import { createDatabaseToolLoopAgent } from "../src/lib/agents/database";
import { getNameAndDdlForTarget } from "../src/lib/agents/database/input_schema";
import {
  DATABASE_CHOICES,
  type DatabaseTargetId,
} from "../src/lib/agents/database/info";
import {
  assertReadonlySqlInput,
  MAX_ROWS,
  STMT_TIMEOUT_MS,
} from "../src/lib/agents/database/sql_readonly";

const PSQL_URL1 = process.env.DATABASE_URL1;
const PSQL_URL2 = process.env.DATABASE_URL2;

type SqlResultRow = Record<string, unknown>;

function getNeonForTarget(id: DatabaseTargetId) {
  const url = id === "1" ? PSQL_URL1 : PSQL_URL2;
  if (!url) return null;
  return neon(url);
}

export function createNeonSqlQueryTool(id: DatabaseTargetId) {
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
    async execute({ sql: raw }) {
      const sqlf = getNeonForTarget(id);
      if (!sqlf) {
        throw new Error("Database connection is not configured.");
      }
      const sqlText = assertReadonlySqlInput(raw);
      const allResults = await sqlf.transaction(
        (tx) => [
          tx.query(`SET LOCAL statement_timeout = ${STMT_TIMEOUT_MS}`),
          tx.query(sqlText, []),
        ],
        { readOnly: true, isolationLevel: "ReadCommitted" },
      );
      const rowChunk = allResults[1] as unknown;
      const rows = Array.isArray(rowChunk) ? (rowChunk as SqlResultRow[]) : [];
      const truncated = rows.length > MAX_ROWS;
      return {
        rowCount: Math.min(rows.length, MAX_ROWS),
        truncated,
        rows: rows.slice(0, MAX_ROWS),
      };
    },
  });
}

export function getNeonDatabaseAgentForConvex(target: DatabaseTargetId) {
  const url = target === "1" ? PSQL_URL1 : PSQL_URL2;
  if (!url) {
    return null;
  }
  const { name, schemaDdl } = getNameAndDdlForTarget(target);
  const sqlQuery = createNeonSqlQueryTool(target);
  return createDatabaseToolLoopAgent(name, schemaDdl, sqlQuery);
}
