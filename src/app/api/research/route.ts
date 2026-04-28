import { researchAgent } from "@/lib/agents/research";
import { handleAgentRequest } from "@/lib/agents/shared";

export const maxDuration = 60;

export const POST = (req: Request) => handleAgentRequest(req, researchAgent);
