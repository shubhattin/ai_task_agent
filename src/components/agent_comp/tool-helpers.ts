import type {
  CodeInterpreterToolInput,
  CodeInterpreterToolOutput,
  ToolPartLike,
  WebSearchToolOutput,
} from "./types";

export function getWebSearchStepLabel(tool: ToolPartLike): string {
  const o = tool.output as WebSearchToolOutput | undefined;
  const action = o?.action;

  if (action?.type === "search") {
    const q = action.query?.trim();
    if (q) return `Searched "${q}"`;
  }
  if (action?.type === "openPage") {
    const raw = action.url?.trim();
    if (raw) {
      try {
        const host = new URL(raw).hostname.replace(/^www\./, "");
        return `Opened ${host}`;
      } catch {
        return "Opened page";
      }
    }
  }
  if (action?.type === "findInPage") {
    const hint = action.pattern?.trim() || action.url?.trim();
    if (hint) return `Find in page: ${hint}`;
    return "Find in page";
  }

  if (tool.state === "output-available" || tool.state === "output-error") {
    return "Web search";
  }
  return "Searching…";
}

export function getWebSearchResultUrls(output: unknown): string[] {
  const o = output as WebSearchToolOutput | undefined;
  const fromSources = (o?.sources ?? [])
    .filter(
      (s): s is { type: "url"; url: string } =>
        s.type === "url" && typeof s.url === "string",
    )
    .map((s) => s.url);
  if (fromSources.length > 0) return fromSources;
  const legacy = o?.results ?? [];
  return legacy.map((r) => r.url).filter(Boolean) as string[];
}

export function shortContainerId(id: string, head = 8, tail = 4) {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

export function truncateDisplayText(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function getCodeInterpreterStepLabel(
  tool: ToolPartLike & { errorText?: string },
): string {
  if (tool.state === "output-error") {
    return "Code interpreter failed";
  }
  if (tool.state === "output-available") {
    const out = tool.output as CodeInterpreterToolOutput | undefined;
    const outs = out?.outputs;
    if (outs && outs.length > 0) {
      const hasLogs = outs.some((o) => o.type === "logs" && o.logs?.trim());
      const hasImages = outs.some((o) => o.type === "image");
      if (hasImages && !hasLogs) return "Code interpreter (image output)";
      if (hasLogs) return "Code interpreter (finished)";
    }
    return "Code interpreter (finished)";
  }
  const input = tool.input as CodeInterpreterToolInput | undefined;
  const code = input?.code?.trim();
  if (code) {
    const firstLine = code.split("\n")[0] ?? "";
    return `Running: ${truncateDisplayText(firstLine, 56)}`;
  }
  if (
    tool.state === "input-streaming" ||
    tool.state === "input-available" ||
    tool.state === "approval-requested" ||
    tool.state === "approval-responded"
  ) {
    return "Code interpreter (running)…";
  }
  return "Code interpreter";
}

export function getCodeInterpreterSessionDescription(
  containerId: string | undefined,
): string | undefined {
  if (!containerId?.trim()) return undefined;
  return `Sandbox session ${shortContainerId(containerId)} — same id across steps keeps state`;
}
