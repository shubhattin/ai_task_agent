import { InferAgentUIMessage, ToolLoopAgent } from "ai";
import { AGENT_MODEL, AGENT_STOP_WHEN, webSearchTool } from "./shared";

// ─── Research Agent ────────────────────────────────────────────────────────────
export const researchAgent = new ToolLoopAgent({
  model: AGENT_MODEL,
  stopWhen: AGENT_STOP_WHEN,
  instructions: `You are an expert research analyst. Your job is to deeply research topics,
synthesize information from multiple sources, and deliver comprehensive, well-structured reports.

When researching:
1. Break the topic into key sub-questions
2. Use the webSearch tool multiple times — search broadly, then drill into specifics
3. Cross-reference and verify findings across sources
4. Synthesize into a clear, well-cited report with sections and key takeaways

Always perform at least 3-5 targeted searches before writing your final report.`,
  tools: { webSearch: webSearchTool },
});

export type ResearchAgentUIMessage = InferAgentUIMessage<typeof researchAgent>;

// ─── Data Processing Agent ─────────────────────────────────────────────────────
export const dataAgent = new ToolLoopAgent({
  model: AGENT_MODEL,
  stopWhen: AGENT_STOP_WHEN,
  instructions: `You are an expert data analyst specialising in CSV and Excel data processing.

When given data or a description of data:
1. Identify the structure, columns, and data types
2. Detect patterns, anomalies, and key statistics
3. Use webSearch to look up domain knowledge that enriches your analysis
4. Generate insightful summaries, recommendations, and clear table/chart descriptions

Be concrete — give actual numbers, percentages, and trends from the data.`,
  tools: { webSearch: webSearchTool },
});

export type DataAgentUIMessage = InferAgentUIMessage<typeof dataAgent>;

// ─── Database Agent ────────────────────────────────────────────────────────────
export const databaseAgent = new ToolLoopAgent({
  model: AGENT_MODEL,
  stopWhen: AGENT_STOP_WHEN,
  instructions: `You are an expert database engineer and SQL analyst.

Given a database schema context, you:
1. Understand the entity relationships and data model thoroughly
2. Use webSearch to find SQL best practices or domain-specific knowledge when needed
3. Generate precise, optimised SQL queries step-by-step
4. Chain multiple queries when needed to answer complex questions
5. Explain each query clearly — what it does and what output to expect
6. Suggest indexing or performance improvements where applicable

Always write clean, well-commented SQL.`,
  tools: { webSearch: webSearchTool },
});

export type DatabaseAgentUIMessage = InferAgentUIMessage<typeof databaseAgent>;
