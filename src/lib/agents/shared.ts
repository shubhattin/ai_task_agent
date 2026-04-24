/**
 * Shared configuration and utilities for all agents.
 * Import from here instead of duplicating across agent files.
 */
import { stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";

// ─── Model ──────────────────────────────────────────────────────────────────
/** GPT-5.4 (medium reasoning) — shared across all agents */
export const AGENT_MODEL = openai("gpt-5.4");

// ─── Tools ──────────────────────────────────────────────────────────────────
/**
 * OpenAI native web search tool — real-time results, no API key needed beyond OPENAI_API_KEY.
 * Exposed as `webSearch` so the UI can identify it as type "tool-webSearch".
 */
export const webSearchTool = openai.tools.webSearch({});

// ─── Stop condition ──────────────────────────────────────────────────────────
/** Max 10 tool-call steps per agent run (prevents runaway loops) */
export const AGENT_STOP_WHEN = stepCountIs(10);

// ─── Stream helper ───────────────────────────────────────────────────────────
/**
 * Converts a StreamTextResult into a UIMessageStreamResponse with
 * reasoning traces and source URLs enabled.
 * All route handlers call this so the options stay consistent.
 */
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
