import { createFileRoute } from "@tanstack/react-router";
import { researchAgent } from "@/lib/agents/research";
import { handleAgentRequest } from "@/lib/agents/shared";

export const Route = createFileRoute("/api/research")({
  server: {
    handlers: {
      POST: ({ request }) => handleAgentRequest(request, researchAgent),
    },
  },
});
