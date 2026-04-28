import type { ReactNode } from "react";

export type AgentTabId = "research" | "data" | "database";

export interface TabConfig {
  id: AgentTabId;
  label: string;
  icon: ReactNode;
  description: string;
  placeholder: string;
  apiPath: string;
  accentColor: string;
  capabilities: string[];
}

/** OpenAI provider `webSearch` tool output (@ai-sdk/openai). */
export type WebSearchToolOutput = {
  action?:
    | { type: "search"; query?: string }
    | { type: "openPage"; url?: string | null }
    | { type: "findInPage"; url?: string | null; pattern?: string | null };
  sources?: Array<{ type: "url"; url: string } | { type: "api"; name: string }>;
  results?: Array<{ title?: string; url?: string }>;
};

export type ToolPartLike = {
  type: string;
  state: string;
  input?: unknown;
  output?: unknown;
};

export type CodeInterpreterToolInput = {
  code?: string | null;
  containerId: string;
};

export type CodeInterpreterToolOutput = {
  outputs?: Array<
    { type: "logs"; logs: string } | { type: "image"; url: string }
  > | null;
};

export type SqlQueryToolInput = { sql?: string | null };
export type SqlQueryToolOutput = {
  rowCount: number;
  truncated: boolean;
  rows: unknown[];
};
