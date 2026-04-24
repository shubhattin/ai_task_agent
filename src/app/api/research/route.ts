import { handleAgentRequest, maxDuration } from "@/lib/agents/shared";
import { researchAgent } from "@/lib/agents/agents";

export { maxDuration };

export const POST = (req: Request) => handleAgentRequest(req, researchAgent);
