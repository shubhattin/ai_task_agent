/**
 * Shared configuration and utilities for all agents.
 * Import from here instead of duplicating across agent files.
 */
import { stepCountIs, convertToModelMessages } from "ai";
import type { UIMessage, ToolLoopAgent } from "ai";
import { openai } from "@ai-sdk/openai";
import { coerceTabularFilePartsToText } from "./coerce-tabular-file-parts";

// ─── Model ──────────────────────────────────────────────────────────────────
/** GPT-5.4 (medium reasoning) — shared across all agents */
export const AGENT_MODEL = openai("gpt-5.4-mini");

/**
 * Appended to every agent’s system instructions. Matches chat rendering (Streamdown +
 * KaTeX); not required for math to work, but nudges consistent $ / $$ LaTeX in answers.
 */
/**
 * Nudges INR, Indian numbering, and local conventions in answers (rent, money, dates, utilities).
 * Appended to all agent system prompts.
 */
export const AGENT_INDIAN_LOCALE_HINT = `**Locale (India):** In all natural-language answers, **money and rent** must be discussed in **Indian Rupees (INR)**: use the **₹** symbol (or "Rs" / "INR" when needed) and **Indian place-value grouping** (e.g. ₹1,25,000; 12.5 **lakh**; 2.1 **crore** when helpful in prose). Do not default to US dollars. For **dates** in explanations, prefer **DD-MM-YYYY** or unambiguous long forms unless the data follows another convention. For **electricity/utility** amounts, use **kWh** and Indian bill phrasing (e.g. "units" of electricity) when relevant. If database or file columns store amounts in a different unit (e.g. **paise**, whole **rupees**), say so and convert or label clearly.`;

export const AGENT_MARKDOWN_MATH_HINT =
  "Mathematical notation is rendered with KaTeX. Prefer **$...$** for short inline TeX, and use **display math** on its **own line** as $$ ... $$ (newline before the opening $$ and after the closing $$ when possible) so it parses reliably. You may also use **\\( ... \\)** for inline and **\\[ ... \\]** for display; both are normalised. Do not use only plain [ ... ] for TeX. For a literal dollar in prose, use \\$ or words like 'USD'.";

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
/** UIMessage stream (reasoning + sources) for any ToolLoopAgent stream result. */
export function toStreamResponse(result: {
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
 * Each route.ts just needs (Next.js needs a literal `maxDuration` in the route file, not
 * re-exported from here):
 *   export const maxDuration = 60;
 *   import { handleAgentRequest } from "@/lib/agents/shared";
 *   import { researchAgent } from "@/lib/agents/agents";
 *   export const POST = (req: Request) => handleAgentRequest(req, researchAgent);
 */
export async function handleAgentRequest(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent: ToolLoopAgent<never, any, any>,
): Promise<Response> {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const forModel = await coerceTabularFilePartsToText(messages);
    const result = await agent.stream({
      messages: await convertToModelMessages(forModel),
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
