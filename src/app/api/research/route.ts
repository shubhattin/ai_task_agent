import { convertToModelMessages, UIMessage } from "ai";
import { researchAgent } from "@/lib/agents/agents";
import { toStreamResponse } from "@/lib/agents/shared";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = await researchAgent.stream({
    messages: await convertToModelMessages(messages),
  });
  return toStreamResponse(result);
}
