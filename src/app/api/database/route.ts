import { convertToModelMessages, UIMessage } from "ai";
import { databaseAgent } from "@/lib/agents/agents";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = await databaseAgent.stream({
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}
