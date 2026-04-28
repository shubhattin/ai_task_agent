import type { UIMessage } from "ai";
import { convertToModelMessages, streamText } from "ai";
import { coerceTabularFilePartsToText } from "@/lib/agents/coerce-tabular-file-parts";
import { AGENT_MODEL } from "@/lib/agents/shared";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    const forModel = await coerceTabularFilePartsToText(messages);

    const result = streamText({
      model: AGENT_MODEL,
      messages: await convertToModelMessages(forModel),
      system: `You are a senior analyst and technical writer. You will receive prior messages only as raw material. Your job is to produce one cohesive document that reads as original research or a professional briefing on the subject matter itself—not as a recap of a chat, assistant output, or “summary.”

Rules:
- Write in a direct, authoritative tone, as if this document were the primary deliverable on the topic.
- Do not mention summaries, conversations, chats, users, assistants, agents, prompts, requests, or that material came from dialogue.
- Do not use framing like “The user wanted…”, “In this conversation…”, “Key findings from the research”, or section titles that expose process (e.g. “User objective”, “What the agent did”).
- Organize with clear Markdown (title, sections, lists, **bold** for emphasis) suitable for printing or PDF. Start with a strong title and substantive sections; integrate objectives and conclusions naturally inside the narrative.
- Merge duplicate or overlapping points; prefer precision and structure over repetition.
- If the thread mixed several topics, pick the dominant substantive thread and cover it thoroughly rather than narrating the thread’s structure.

Output only the Markdown document—no preamble, no closing remarks, no meta commentary.`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[summarize-route] Error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to generate summary",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
