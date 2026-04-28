import { openai } from "@ai-sdk/openai";
import type { ToolLoopAgent, UIMessage } from "ai";
import { convertToModelMessages, stepCountIs } from "ai";
import { coerceTabularFilePartsToText } from "./coerce_csv";

export const AGENT_MODEL = openai("gpt-5.4-nano");

export const AGENT_INDIAN_LOCALE_HINT = `**Locale (India):** In all natural-language answers, **money and rent** must be discussed in **Indian Rupees (INR)**: use the **₹** symbol (or "Rs" / "INR" when needed) and **Indian place-value grouping** (e.g. ₹1,25,000; 12.5 **lakh**; 2.1 **crore** when helpful in prose). Do not default to US dollars. For **dates** in explanations, prefer **DD-MM-YYYY** or unambiguous long forms unless the data follows another convention. For **electricity/utility** amounts, use **kWh** and Indian bill phrasing (e.g. "units" of electricity) when relevant. If database or file columns store amounts in a different unit (e.g. **paise**, whole **rupees**), say so and convert or label clearly.`;
export const AGENT_MARKDOWN_MATH_HINT =
  "Mathematical notation is rendered with KaTeX. Prefer **$...$** for short inline TeX, and use **display math** on its **own line** as $$ ... $$ (newline before the opening $$ and after the closing $$ when possible) so it parses reliably. You may also use **\\( ... \\)** for inline and **\\[ ... \\]** for display; both are normalised. Do not use only plain [ ... ] for TeX. For a literal dollar in prose, use \\$ or words like 'USD'.";

export const webSearchTool = openai.tools.webSearch({});
export const codeInterpreterTool = openai.tools.codeInterpreter({});

export const AGENT_STOP_WHEN = stepCountIs(10);

export const maxDuration = 60;

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

export async function handleAgentRequest(
  req: Request,
  // biome-ignore lint/suspicious/noExplicitAny: tool map and output shapes vary by agent route
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
