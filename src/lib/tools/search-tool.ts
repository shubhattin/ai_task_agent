import { tool } from "ai";
import { z } from "zod";

export const searchTool = tool({
  description:
    "Search the web for up-to-date information on a topic. Returns relevant results.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up"),
  }),
  execute: async ({ query }) => {
    // Stub: in production integrate a real search API (Tavily, Serper, Bing etc.)
    await new Promise((r) => setTimeout(r, 800));
    return {
      query,
      results: [
        {
          title: `Results for "${query}"`,
          snippet:
            "This is a stub search result. Wire up a real search API (Tavily, Serper, Brave) for live results.",
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  },
});
