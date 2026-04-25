import { handleAgentRequest } from "@/lib/agents/shared";
import { dataAgent } from "@/lib/agents/agents";

export const maxDuration = 60;

export const POST = (req: Request) => handleAgentRequest(req, dataAgent);
