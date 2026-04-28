import { BarChart3Icon, DatabaseIcon, SearchIcon } from "lucide-react";
import type { TabConfig } from "./types";

export const TABS: TabConfig[] = [
  {
    id: "research",
    label: "Research",
    icon: <SearchIcon className="size-4" />,
    description:
      "Deep-dives any topic using multi-step web search and synthesis.",
    placeholder:
      "E.g. Summarise the latest advances in quantum computing and their commercial applications…",
    apiPath: "/api/research",
    accentColor: "text-violet-400",
    capabilities: ["Web Search", "Multi-step reasoning", "Report synthesis"],
  },
  {
    id: "data",
    label: "Data Processing",
    icon: <BarChart3Icon className="size-4" />,
    description:
      "Analyse CSV / Excel data and extract actionable insights automatically.",
    placeholder:
      "Paste your CSV data or describe your dataset and what insights you want…",
    apiPath: "/api/data",
    accentColor: "text-emerald-400",
    capabilities: [
      "CSV / Excel analysis",
      "Statistical insights",
      "Trend detection",
    ],
  },
  {
    id: "database",
    label: "Database",
    icon: <DatabaseIcon className="size-4" />,
    description:
      "Query two read-only PostgreSQL schemas with live SELECTs, web search, and optional code analysis.",
    placeholder:
      "Ask questions about the data (two read-only DBs available below)…",
    apiPath: "/api/database",
    accentColor: "text-sky-400",
    capabilities: [
      "Read-only SQL",
      "Schema + multi-step",
      "Query optimisation",
    ],
  },
];
