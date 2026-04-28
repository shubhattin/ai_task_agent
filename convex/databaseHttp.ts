import { getAuthUserId } from "@convex-dev/auth/server";
import type { UIMessage } from "ai";
import { convertToModelMessages } from "ai";
import { z } from "zod";
import { coerceTabularFilePartsToText } from "../src/lib/agents/coerce_csv";
import { toStreamResponse } from "../src/lib/agents/shared";
import { httpAction } from "./_generated/server";
import { getNeonDatabaseAgentForConvex } from "./neonDatabaseAgent";

const bodySchema = z.object({
  messages: z.array(z.unknown()),
  database: z.union([z.literal("1"), z.literal("2")]).default("1"),
});

function withCors(request: Request, res: Response): Response {
  const origin = request.headers.get("Origin");
  const headers = new Headers(res.headers);
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export const databaseAgentOptions = httpAction(async (_ctx, request) => {
  if (request.method !== "OPTIONS") {
    return new Response(null, { status: 405 });
  }
  return withCors(request, new Response(null, { status: 204 }));
});

export const databaseAgentPost = httpAction(async (ctx, request) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return withCors(
      request,
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  try {
    const json = (await request.json()) as unknown;
    const { messages, database } = bodySchema.parse(json);
    const agent = getNeonDatabaseAgentForConvex(database);
    if (!agent) {
      return withCors(
        request,
        new Response(
          JSON.stringify({
            error: `Database ${database} is not configured. Set ${database === "1" ? "DATABASE_URL1" : "DATABASE_URL2"} in Convex environment.`,
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    const forModel = await coerceTabularFilePartsToText(
      messages as UIMessage[],
    );
    const result = await agent.stream({
      messages: await convertToModelMessages(forModel),
    });
    return withCors(request, toStreamResponse(result));
  } catch (e) {
    console.error("[convex database-agent] Error:", e);
    return withCors(
      request,
      new Response(JSON.stringify({ error: "Database agent request failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
});
