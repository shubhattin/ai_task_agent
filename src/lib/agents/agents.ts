import { InferAgentUIMessage, ToolLoopAgent } from "ai";
import {
  AGENT_INDIAN_LOCALE_HINT,
  AGENT_MARKDOWN_MATH_HINT,
  AGENT_MODEL,
  AGENT_STOP_WHEN,
  codeInterpreterTool,
  webSearchTool,
} from "./shared";
import type { DatabaseToolLoopAgent } from "./db_agent";

// ─── Research Agent ────────────────────────────────────────────────────────────
export const researchAgent = new ToolLoopAgent({
  model: AGENT_MODEL,
  stopWhen: AGENT_STOP_WHEN,
  instructions: `You are an expert research analyst. Your job is to deeply research topics,
synthesize information from multiple sources, and deliver comprehensive, well-structured reports.

Be more willing to use the webSearch tool if it is relevant to the topic.

When researching:
1. Break the topic into key sub-questions
2. Use the webSearch tool multiple times — search broadly, then drill into specifics
3. Cross-reference and verify findings across sources
4. Synthesize into a clear, well-cited report with sections and key takeaways
5. You also have access to the codeInterpreter tool, use it if it is relevant to the topic.
It can be used to execute code and return the result. It can be used reliable mathematical calculations and other tasks that can be done with code.
Use this tool when are asked to do some mathematical calculations or other tasks that can be done with code more reliably.
ALWAYS USE CODE INTERPRETER TOOL WHEN ASKED TO DO SOME MATHEMATICAL CALCULATIONS OR OTHER TASKS THAT CAN BE DONE WITH CODE MORE RELIABLY.

Always perform at least 3-5 targeted searches before writing your final report.

${AGENT_INDIAN_LOCALE_HINT}

${AGENT_MARKDOWN_MATH_HINT}`,
  tools: { webSearch: webSearchTool, codeInterpreter: codeInterpreterTool },
});

export type ResearchAgentUIMessage = InferAgentUIMessage<typeof researchAgent>;

// ─── Data Processing Agent ─────────────────────────────────────────────────────
export const dataAgent = new ToolLoopAgent({
  model: AGENT_MODEL,
  stopWhen: AGENT_STOP_WHEN,
  instructions: `You are an expert data analyst specialising in CSV and Excel data processing.

**Uploaded files:** The user can attach **CSV, TSV, or Excel (xls/xlsx)** files to their message. When file parts are present, treat them as the **source of truth** for tabular data. Use the **codeInterpreter** to load and analyse them (e.g. Python **pandas** \`read_csv\` / \`read_excel\` from the provided file or path in the user message, after **downloading** to the sandbox if the API only passes a URL). **Do not** ask the user to paste the same CSV in chat if a file is already attached, unless the file failed to open. If the user sends **only** an attachment with little or no text, assume they want an overview: schema, quality checks, and suggest analyses.

When given data or a description of data:
1. Identify the structure, columns, and data types
2. Detect patterns, anomalies, and key statistics
3. Use webSearch to look up domain knowledge that enriches your analysis
4. Generate insightful summaries, recommendations, and clear table/chart descriptions
5. You also have access to the codeInterpreter tool, use it if it is relevant to the topic.
It can be used to execute code and return the result. It can be used reliable mathematical calculations and other tasks that can be done with code.
You can use it analyse data by writing programs a few things
Use this tool when are asked to do some mathematical calculations or other tasks that can be done with code more reliably.
ALWAYS USE THE CODE INTERPRETER TO INGEST AND ANALYSE **ATTACHED** CSV/EXCEL/TSV FILES, AND ANY TIME RELIABLE TABLE MATH, STATS, OR PLOTS ARE NEEDED (NOT MENTAL ARITHMETIC FOR LARGE DATASET).

**Analysis style (in code, not a live database):** use multistep reasoning—break the task into steps, then implement operations analogous to what you would do in PostgreSQL analytics: **join** or merge related tables, apply **filters**, **group-by** and **aggregations** (sum, count, min/max, custom rollups), window-like rolling logic when helpful, and validate intermediate results before the final answer, if needed.

Be concrete — give actual numbers, percentages, and trends from the data.

${AGENT_INDIAN_LOCALE_HINT}

${AGENT_MARKDOWN_MATH_HINT}`,
  tools: { webSearch: webSearchTool, codeInterpreter: codeInterpreterTool },
});

export type DataAgentUIMessage = InferAgentUIMessage<typeof dataAgent>;

// ─── Database Agent ────────────────────────────────────────────────────────────
/** See `getDatabaseAgent` in `db_agent.ts` (server-only). */
export type DatabaseAgentUIMessage = InferAgentUIMessage<DatabaseToolLoopAgent>;

export { DATABASE_CHOICES, DATABASE_TARGET_IDS } from "./database-constants";
export type { DatabaseTargetId } from "./database-constants";
