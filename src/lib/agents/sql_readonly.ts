export const MAX_ROWS = 500;
export const STMT_TIMEOUT_MS = 10_000;

/**
 * Heuristic + PostgreSQL enforces the rest via default_transaction_read_only in-session.
 */
export function assertReadonlySqlInput(sql: string): string {
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
    throw new Error(
      "Only a single statement is allowed (no multiple queries).",
    );
  }
  if (!/^(SELECT|WITH)\b/i.test(one)) {
    throw new Error(
      "Only SELECT or WITH (CTEs leading to a read) are allowed — no DML/DDL.",
    );
  }
  if (
    /\b(INSERT|UPDATE|DELETE|TRUNCATE|GRANT|REVOKE|ALTER|CREATE|DROP|VACUUM|COPY)\b/i.test(
      one,
    )
  ) {
    throw new Error(
      "That statement contains a forbidden SQL keyword for read-only use.",
    );
  }
  return one;
}
