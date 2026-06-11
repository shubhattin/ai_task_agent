import { createFileRoute } from "@tanstack/react-router";
import { dataAgent } from "@/lib/agents/data";
import { handleAgentRequest } from "@/lib/agents/shared";

export const Route = createFileRoute("/api/data")({
  server: {
    handlers: {
      POST: ({ request }) => handleAgentRequest(request, dataAgent),
    },
  },
});
