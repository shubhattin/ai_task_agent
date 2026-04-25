import { maxDuration } from "@/lib/agents/shared";
import { handleDatabaseAgentRequest } from "@/lib/agents/db_agent";

export { maxDuration };

export const POST = (req: Request) => handleDatabaseAgentRequest(req);
