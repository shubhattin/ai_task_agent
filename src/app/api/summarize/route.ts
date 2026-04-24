import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { AGENT_MODEL, maxDuration } from "@/lib/agents/shared";

export { maxDuration };

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
      model: AGENT_MODEL,
      messages: await convertToModelMessages(messages),
      system: `You are an expert summarizer. Your task is to write a comprehensive, highly-structured Markdown summary based on the conversation history provided.
Your summary should capture:
1. The user's original objective or request.
2. The key findings, data, or actions performed by the agent.
3. Any significant insights or conclusions.

Use rich Markdown formatting (headers, bullet points, bold text, etc.) to make the report easily readable. Do not use generic conversational filler like "Here is a summary...". Just output the final document cleanly.`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[summarize-route] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate summary" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
