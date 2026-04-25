/**
 * Shared configuration and utilities for all agents.
 * Import from here instead of duplicating across agent files.
 */
import { stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage, ToolLoopAgent } from "ai";
import { openai } from "@ai-sdk/openai";

// ─── Model ──────────────────────────────────────────────────────────────────
/** GPT-5.4 (medium reasoning) — shared across all agents */
export const AGENT_MODEL = openai("gpt-5.4-mini");

/**
 * Appended to every agent’s system instructions. Matches chat rendering (Streamdown +
 * KaTeX); not required for math to work, but nudges consistent $ / $$ LaTeX in answers.
 */
export const AGENT_MARKDOWN_MATH_HINT =
  "Mathematical notation in markdown is rendered in the chat: use $...$ for inline LaTeX and $$...$$ on their own lines for display equations. For a literal dollar sign in normal text, write \\$.";

// ─── Tools ──────────────────────────────────────────────────────────────────
/**
 * OpenAI native web search tool — real-time results, no API key needed beyond OPENAI_API_KEY.
 * Exposed as `webSearch` so the UI can identify it as type "tool-webSearch".
 */
export const webSearchTool = openai.tools.webSearch({});

/**
 * OpenAI native code interpreter (Python in a managed sandbox).
 *
 * - **Sessions:** With default options, the model receives a `containerId` on each tool
 *   call and reuses it across steps in the same run so the environment persists (files,
 *   variables). Pass `container: { fileIds: [...] }` only when you need specific uploaded
 *   OpenAI file IDs available in the sandbox.
 * - **Latency:** The Responses API streams tool events; no extra config is required here.
 */
export const codeInterpreterTool = openai.tools.codeInterpreter({});

// ─── Stop condition ──────────────────────────────────────────────────────────
/** Max 10 tool-call steps per agent run (prevents runaway loops) */
export const AGENT_STOP_WHEN = stepCountIs(10);

// ─── Route config ────────────────────────────────────────────────────────────
/** Max execution time per request */
export const maxDuration = 60;

// ─── Stream helper ───────────────────────────────────────────────────────────
function toStreamResponse(result: {
  toUIMessageStreamResponse: (opts?: {
    sendReasoning?: boolean;
    sendSources?: boolean;
  }) => Response;
}): Response {
  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
  });
}

// ─── Shared route handler ────────────────────────────────────────────────────
/**
 * Shared POST handler for all agent routes.
 * Handles: JSON body parsing → convertToModelMessages → agent.stream → response.
 *
 * Each route.ts just needs:
 *   import { handleAgentRequest } from "@/lib/agents/shared";
 *   import { researchAgent } from "@/lib/agents/agents";
 *   export { maxDuration } from "@/lib/agents/shared";
 *   export const POST = (req: Request) => handleAgentRequest(req, researchAgent);
 */
export async function handleAgentRequest(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent: ToolLoopAgent<never, any, any>,
): Promise<Response> {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const result = await agent.stream({
      messages: await convertToModelMessages(messages),
    });
    return toStreamResponse(result);
  } catch (error) {
    console.error("[agent-route] Error:", error);
    return new Response(JSON.stringify({ error: "Agent request failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
