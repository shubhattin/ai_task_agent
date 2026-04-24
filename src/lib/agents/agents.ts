import { InferAgentUIMessage, ToolLoopAgent } from "ai";
import { openai } from "@ai-sdk/openai";
import { searchTool } from "../tools/search-tool";

// GPT-5.4 (medium reasoning) — the model specified by the user
const MODEL = openai("gpt-5.4");

// ─── Research Agent ────────────────────────────────────────────────────────────
export const researchAgent = new ToolLoopAgent({
  model: MODEL,
  instructions: `You are an expert research analyst. Your job is to deeply research topics, 
synthesize information from multiple sources, and deliver comprehensive, well-structured reports.

When researching:
1. Break the topic into key sub-questions
2. Search for information on each angle
3. Cross-reference and verify findings
4. Synthesize into a clear, well-cited report with sections

Always use the search tool multiple times to gather broad, accurate information.`,
  tools: {
    search: searchTool,
  },
});

export type ResearchAgentUIMessage = InferAgentUIMessage<typeof researchAgent>;

// ─── Data Processing Agent ─────────────────────────────────────────────────────
export const dataAgent = new ToolLoopAgent({
  model: MODEL,
  instructions: `You are an expert data analyst specialising in CSV and Excel data processing.
  
When given data or a description of data:
1. Identify the structure, columns, and data types
2. Detect patterns, anomalies, and key statistics
3. Generate insightful summaries and recommendations
4. Produce clear charts or table descriptions where helpful

Search the web for relevant domain knowledge to enrich your analysis.`,
  tools: {
    search: searchTool,
  },
});

export type DataAgentUIMessage = InferAgentUIMessage<typeof dataAgent>;

// ─── Database Agent ────────────────────────────────────────────────────────────
export const databaseAgent = new ToolLoopAgent({
  model: MODEL,
  instructions: `You are an expert database engineer and SQL analyst.

Given a database schema context, you:
1. Understand the entity relationships and data model
2. Generate precise, optimised SQL queries step-by-step
3. Chain multiple queries when needed to answer complex questions
4. Explain each query and its expected output
5. Suggest indexing or performance improvements

Search for SQL best practices or domain knowledge when needed.`,
  tools: {
    search: searchTool,
  },
});

export type DatabaseAgentUIMessage = InferAgentUIMessage<typeof databaseAgent>;
