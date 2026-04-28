"use client";

import { useChat, useCompletion } from "@ai-sdk/react";
import { api } from "@convex/_generated/api";
import type { Doc as AgentChatDoc, Id } from "@convex/_generated/dataModel";
import { useAuthToken } from "@convex-dev/auth/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useMutation, useQuery } from "convex/react";
// ─── Icons ─────────────────────────────────────────────────────────────────────
import {
  BarChart3Icon,
  CopyIcon,
  DatabaseIcon,
  DownloadIcon,
  GlobeIcon,
  RefreshCcwIcon,
  SearchIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react";
import {
  Fragment,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtImage,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
// ─── AI Elements ───────────────────────────────────────────────────────────────
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { UserAccountMenu } from "@/components/UserAccountMenu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  DATABASE_CHOICES,
  DATABASE_TARGET_IDS,
  type DatabaseTargetId,
} from "@/lib/agents/database/info";
import { getConvexHttpSiteUrl } from "@/lib/convex-site";

// ─── Tab config ────────────────────────────────────────────────────────────────

export type AgentTabId = "research" | "data" | "database";

interface TabConfig {
  id: AgentTabId;
  label: string;
  icon: React.ReactNode;
  description: string;
  placeholder: string;
  apiPath: string;
  accentColor: string;
  capabilities: string[];
}

const TABS: TabConfig[] = [
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

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * OpenAI provider `webSearch` tool: `input` is always `{}` — the model’s query and
 * citations are returned in `output` (see @ai-sdk/openai web-search tool schema).
 */
type WebSearchToolOutput = {
  action?:
  | { type: "search"; query?: string }
  | { type: "openPage"; url?: string | null }
  | { type: "findInPage"; url?: string | null; pattern?: string | null };
  sources?: Array<{ type: "url"; url: string } | { type: "api"; name: string }>;
  /** Legacy / alternate shape */
  results?: Array<{ title?: string; url?: string }>;
};

type ToolPartLike = {
  type: string;
  state: string;
  input?: unknown;
  output?: unknown;
};

function getWebSearchStepLabel(tool: ToolPartLike): string {
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

function getWebSearchResultUrls(output: unknown): string[] {
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

/**
 * OpenAI `codeInterpreter` tool — matches @ai-sdk/openai codeInterpreterInputSchema /
 * codeInterpreterOutputSchema (see `openai.tools.codeInterpreter`).
 */
type CodeInterpreterToolInput = {
  code?: string | null;
  containerId: string;
};

type CodeInterpreterToolOutput = {
  outputs?: Array<
    { type: "logs"; logs: string } | { type: "image"; url: string }
  > | null;
};

type SqlQueryToolInput = { sql?: string | null };
type SqlQueryToolOutput = {
  rowCount: number;
  truncated: boolean;
  rows: unknown[];
};

function shortContainerId(id: string, head = 8, tail = 4) {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

function truncateDisplayText(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function getCodeInterpreterStepLabel(
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

function getCodeInterpreterSessionDescription(
  containerId: string | undefined,
): string | undefined {
  if (!containerId?.trim()) return undefined;
  return `Sandbox session ${shortContainerId(containerId)} — same id across steps keeps state`;
}

// ─── Sources strip (for source-url parts from webSearch) ───────────────────────

function SourceStrip({ message }: { message: UIMessage }) {
  const sourceUrls = message.parts.filter((p) => p.type === "source-url");
  if (sourceUrls.length === 0) return null;

  return (
    <Sources>
      <SourcesTrigger count={sourceUrls.length} />
      {sourceUrls.map((part, i) => {
        if (part.type !== "source-url") return null;
        return (
          <SourcesContent key={`${message.id}-src-${i}`}>
            <Source href={part.url} title={part.url} />
          </SourcesContent>
        );
      })}
    </Sources>
  );
}

// ─── Attachments display in prompt header ──────────────────────────────────────

function PromptAttachments() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;

  return (
    <Attachments variant="inline">
      {attachments.files.map((file) => (
        <Attachment
          key={file.id}
          data={file}
          onRemove={() => attachments.remove(file.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

// ─── Message Parts renderer ────────────────────────────────────────────────────

function shouldSkipMessagePart(p: UIMessage["parts"][number]): boolean {
  return (
    p.type === "source-url" || p.type === "step-start" || p.type === "file"
  );
}

function renderToolStepsForChain(
  messageId: string,
  toolParts: UIMessage["parts"],
  keyPrefix: string,
) {
  return toolParts.map((part, i) => {
    if (part.type === "tool-webSearch") {
      const tool = part as ToolPartLike;
      const done =
        tool.state === "output-available" || tool.state === "output-error";
      const urls = getWebSearchResultUrls(tool.output);

      return (
        <ChainOfThoughtStep
          key={`${messageId}-${keyPrefix}-${i}`}
          icon={GlobeIcon}
          label={getWebSearchStepLabel(tool)}
          status={done ? "complete" : "active"}
        >
          {urls.length > 0 && (
            <ChainOfThoughtSearchResults>
              {urls.slice(0, 6).map((url) => {
                let host = url;
                try {
                  host = new URL(url).hostname.replace(/^www\./, "");
                } catch {
                  /* keep raw */
                }
                return (
                  <ChainOfThoughtSearchResult key={url}>
                    {host}
                  </ChainOfThoughtSearchResult>
                );
              })}
            </ChainOfThoughtSearchResults>
          )}
        </ChainOfThoughtStep>
      );
    }

    if (part.type === "tool-codeInterpreter") {
      const tool = part as ToolPartLike & { errorText?: string };
      const done =
        tool.state === "output-available" || tool.state === "output-error";
      const input = tool.input as CodeInterpreterToolInput | undefined;
      const output = tool.output as CodeInterpreterToolOutput | undefined;
      const code = typeof input?.code === "string" ? input.code : "";
      const showCode = code.trim().length > 0;
      const sessionHint = getCodeInterpreterSessionDescription(
        input?.containerId,
      );

      return (
        <ChainOfThoughtStep
          key={`${messageId}-${keyPrefix}-${i}`}
          icon={TerminalIcon}
          label={getCodeInterpreterStepLabel(tool)}
          description={sessionHint}
          status={done ? "complete" : "active"}
        >
          {tool.state === "output-error" && tool.errorText ? (
            <p className="text-destructive text-xs whitespace-pre-wrap wrap-break-word">
              {tool.errorText}
            </p>
          ) : null}
          {showCode ? (
            <pre className="max-h-40 overflow-x-auto overflow-y-auto rounded-md border border-border/50 bg-muted/70 p-2 font-mono text-[0.7rem] leading-relaxed wrap-break-word whitespace-pre-wrap">
              {truncateDisplayText(code, 12000)}
            </pre>
          ) : null}
          {tool.state === "output-available" &&
            output?.outputs &&
            output.outputs.length > 0 ? (
            <div className="space-y-2">
              {output.outputs.map((o, oi) =>
                o.type === "logs" ? (
                  <ScrollArea
                    key={oi}
                    className="max-h-44 rounded-md border border-border/50 bg-muted/50"
                  >
                    <pre className="p-2 font-mono text-[0.7rem] leading-relaxed wrap-break-word whitespace-pre-wrap">
                      {o.logs}
                    </pre>
                  </ScrollArea>
                ) : o.type === "image" ? (
                  <ChainOfThoughtImage key={oi}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={o.url}
                      alt="Code interpreter figure"
                      className="max-h-full max-w-full object-contain"
                    />
                  </ChainOfThoughtImage>
                ) : null,
              )}
            </div>
          ) : null}
        </ChainOfThoughtStep>
      );
    }

    if (part.type === "tool-sqlQuery") {
      const tool = part as ToolPartLike & { errorText?: string };
      const done =
        tool.state === "output-available" || tool.state === "output-error";
      const input = tool.input as SqlQueryToolInput | undefined;
      const output = tool.output as SqlQueryToolOutput | undefined;
      const sql = typeof input?.sql === "string" ? input.sql : "";
      const showSql = sql.trim().length > 0;
      const rowHint =
        output && tool.state === "output-available"
          ? output.truncated
            ? ` (${output.rowCount} rows, truncated)`
            : ` (${output.rowCount} rows)`
          : "";

      return (
        <ChainOfThoughtStep
          key={`${messageId}-${keyPrefix}-${i}`}
          icon={DatabaseIcon}
          label={
            tool.state === "output-error"
              ? "SQL query failed"
              : `Read-only query${rowHint}`
          }
          status={done ? "complete" : "active"}
        >
          {tool.state === "output-error" && tool.errorText ? (
            <p className="text-destructive text-xs whitespace-pre-wrap wrap-break-word">
              {tool.errorText}
            </p>
          ) : null}
          {showSql ? (
            <pre className="max-h-36 overflow-x-auto overflow-y-auto rounded-md border border-border/50 bg-muted/70 p-2 font-mono text-[0.7rem] leading-relaxed wrap-break-word whitespace-pre-wrap">
              {truncateDisplayText(sql, 8000)}
            </pre>
          ) : null}
        </ChainOfThoughtStep>
      );
    }

    if (part.type.startsWith("tool-")) {
      const tool = part as ToolPartLike;
      const done =
        tool.state === "output-available" || tool.state === "output-error";
      const name = part.type
        .replace("tool-", "")
        .replace(/([A-Z])/g, " $1")
        .replace(/-/g, " ")
        .trim();
      return (
        <ChainOfThoughtStep
          key={`${messageId}-${keyPrefix}-${i}`}
          icon={SparklesIcon}
          label={name}
          status={done ? "complete" : "active"}
        />
      );
    }

    return null;
  });
}

/**
 * Renders message parts in **stream order** (required for ToolLoopAgent: reasoning → tools →
 * reasoning → text interleaves). Uses ai-elements Reasoning + ChainOfThought + MessageResponse.
 *
 * Skips: source-url (Sources strip), step-start, file (attachments handled above for users).
 */
function MessageParts({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
}) {
  const parts = message.parts;
  const lastIdx = parts.length - 1;
  const lastPart = parts.at(-1);

  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < parts.length) {
    const p = parts[i];

    if (shouldSkipMessagePart(p)) {
      i += 1;
      continue;
    }

    if (p.type === "reasoning") {
      const start = i;
      while (i < parts.length && parts[i].type === "reasoning") {
        i += 1;
      }
      const slice = parts.slice(start, i);
      const reasoningText = slice
        .filter(
          (r): r is Extract<typeof r, { type: "reasoning" }> =>
            r.type === "reasoning",
        )
        .map((r) => r.text)
        .join("\n\n");
      const groupEnd = i - 1;
      const touchesTail = groupEnd === lastIdx;
      const tailReasoning =
        touchesTail && lastPart?.type === "reasoning" ? lastPart : undefined;
      const isReasoningStreaming =
        isLastMessage &&
        isStreaming &&
        tailReasoning != null &&
        tailReasoning.state !== "done";
      const showReasoning =
        slice.length > 0 && (reasoningText.length > 0 || isReasoningStreaming);

      if (showReasoning) {
        out.push(
          <Reasoning
            key={`${message.id}-reason-${start}`}
            className="w-full"
            isStreaming={isReasoningStreaming}
            {...(isReasoningStreaming ? { defaultOpen: true } : {})}
          >
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>,
        );
      }
      continue;
    }

    if (p.type.startsWith("tool-")) {
      const start = i;
      while (
        i < parts.length &&
        typeof parts[i].type === "string" &&
        parts[i].type.startsWith("tool-")
      ) {
        i += 1;
      }
      const toolSlice = parts.slice(start, i);
      const groupEnd = i - 1;
      const groupAtTail = groupEnd === lastIdx;
      const stillRunning =
        Boolean(isLastMessage && isStreaming && groupAtTail) &&
        lastPart?.type !== "text";

      out.push(
        <ChainOfThought
          key={`${message.id}-cot-${start}`}
          defaultOpen={stillRunning}
          className="w-full mb-2"
        >
          <ChainOfThoughtHeader>
            {stillRunning ? "Working…" : "Steps taken"}
          </ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            {renderToolStepsForChain(message.id, toolSlice, `cot-${start}`)}
          </ChainOfThoughtContent>
        </ChainOfThought>,
      );
      continue;
    }

    if (p.type === "text") {
      const isTailWhileStreaming =
        isLastMessage && isStreaming && i === lastIdx;
      out.push(
        <MessageResponse
          key={`${message.id}-txt-${i}`}
          isAnimating={isTailWhileStreaming}
        >
          {p.text}
        </MessageResponse>,
      );
      i += 1;
      continue;
    }

    i += 1;
  }

  return <>{out}</>;
}

// ─── Single Agent Chat Panel ───────────────────────────────────────────────────

function deriveChatTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const textPart = first.parts?.find((p) => p.type === "text");
  const text = textPart && textPart.type === "text" ? textPart.text.trim() : "";
  if (!text) return "New chat";
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

function AgentChat({
  tab,
  sessionId,
  initialMessages,
}: {
  tab: TabConfig;
  sessionId: Id<"agentChats">;
  initialMessages: UIMessage[];
}) {
  const [text, setText] = useState("");
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const token = useAuthToken();
  const saveMessagesM = useMutation(api.chats.saveMessages);

  const databaseTargetRef = useRef<DatabaseTargetId>("2");
  const [, databaseUiTick] = useReducer((n: number) => n + 1, 0);

  const databaseChatBody = useMemo(
    () => ({
      get database(): DatabaseTargetId {
        return databaseTargetRef.current;
      },
    }),
    [],
  );

  const convexHttpBase = getConvexHttpSiteUrl();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api:
          tab.id === "database" && convexHttpBase
            ? `${convexHttpBase}/api/database`
            : tab.apiPath,
        body: tab.id === "database" ? databaseChatBody : undefined,
        fetch:
          tab.id === "database"
            ? (url, init) => {
              if (!token) {
                return Promise.reject(new Error("Not signed in"));
              }
              const h = new Headers(init?.headers);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(String(url), { ...init, headers: h });
            }
            : undefined,
      }),
    [tab.apiPath, tab.id, databaseChatBody, convexHttpBase, token],
  );

  const { messages, sendMessage, status, regenerate } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
    onFinish: ({ messages: next }) => {
      void saveMessagesM({
        id: sessionId,
        messagesJson: JSON.stringify(next),
        title: deriveChatTitle(next),
      });
    },
  });

  const {
    completion: summaryText,
    complete: startSummary,
    isLoading: isSummarizing,
    setCompletion: setSummaryText,
  } = useCompletion({
    api: "/api/summarize",
    streamProtocol: "text",
  });

  const currentDatabaseId = databaseTargetRef.current;
  const currentDatabaseChoice = DATABASE_CHOICES[currentDatabaseId];

  const handlePdfExport = async (markdownText: string) => {
    setIsExportingPdf(true);
    try {
      const { marked } = await import("marked");
      const htmlContent = await marked.parse(markdownText);

      // Dynamically import pdfmake and html-to-pdfmake
      const pdfMakeModule = await import("pdfmake/build/pdfmake");
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
      const htmlToPdfmake =
        (await import("html-to-pdfmake")).default ||
        (await import("html-to-pdfmake"));

      const pdfMake = pdfMakeModule.default || pdfMakeModule;
      const pdfFonts = pdfFontsModule.default || pdfFontsModule;

      (pdfMake as any).vfs = (pdfFonts as any).pdfMake
        ? (pdfFonts as any).pdfMake.vfs
        : (pdfFonts as any).vfs;

      const pdfContent = (htmlToPdfmake as any)(htmlContent, {
        defaultStyles: {
          a: { color: "#0366d6" },
          code: { background: "#f6f8fa" },
          pre: { background: "#f6f8fa", margin: [0, 10, 0, 15] },
          blockquote: { color: "#6a737d", margin: [15, 5, 0, 15] }, // Left indent
          p: { margin: [0, 0, 0, 12] },
          h1: { fontSize: 26, bold: true, margin: [0, 20, 0, 10] },
          h2: { fontSize: 22, bold: true, margin: [0, 16, 0, 8] },
          h3: { fontSize: 18, bold: true, margin: [0, 14, 0, 8] },
          h4: { fontSize: 14, bold: true, margin: [0, 12, 0, 6] },
          h5: { fontSize: 12, bold: true, margin: [0, 10, 0, 6] },
          h6: {
            fontSize: 12,
            bold: true,
            margin: [0, 10, 0, 6],
            color: "#6a737d",
          },
          ul: { margin: [10, 0, 0, 12] },
          ol: { margin: [10, 0, 0, 12] },
          li: { margin: [0, 0, 0, 4] },
          strong: { bold: true },
          em: { italics: true },
        },
      });

      const documentDefinition = {
        content: pdfContent,
        defaultStyle: {
          color: "#111111",
          lineHeight: 1.4,
        },
        pageMargins: [40, 40, 40, 40] as [number, number, number, number],
      };

      pdfMake
        .createPdf(documentDefinition)
        .download(`${tab.label.toLowerCase()}-summary.pdf`);

      setIsSummaryDialogOpen(false); // Close dialog on success
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF");
    } finally {
      setIsExportingPdf(false);
      setSummaryText("");
    }
  };

  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";

  const handleSubmit = (msg: PromptInputMessage) => {
    const hasText = Boolean(msg.text?.trim());
    const hasFiles = msg.files && msg.files.length > 0;
    if (!hasText && !hasFiles) return;

    if (hasText) {
      sendMessage({
        text: msg.text,
        ...(hasFiles ? { files: msg.files } : {}),
      });
    } else if (hasFiles) {
      sendMessage({
        text: "Please analyse the attached file(s).",
        files: msg.files,
      });
    }
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Conversation messages ── */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<span className={tab.accentColor}>{tab.icon}</span>}
              title={`${tab.label} Agent`}
              description={tab.description}
            />
          ) : (
            messages.map((message, idx) => (
              <Fragment key={message.id}>
                {/* Sources bar above assistant messages */}
                {message.role === "assistant" && (
                  <SourceStrip message={message} />
                )}

                <Message from={message.role}>
                  <MessageContent>
                    {/* Render user file attachments */}
                    {message.role === "user" &&
                      (() => {
                        const fileParts = message.parts.filter(
                          (p) => p.type === "file",
                        );
                        if (fileParts.length === 0) return null;
                        return (
                          <Attachments variant="inline" className="mb-2">
                            {fileParts.map((part, fi) => (
                              <Attachment
                                key={`${message.id}-f-${fi}`}
                                data={{ ...part, id: `${message.id}-f-${fi}` }}
                              >
                                <AttachmentPreview />
                              </Attachment>
                            ))}
                          </Attachments>
                        );
                      })()}

                    <MessageParts
                      message={message}
                      isLastMessage={idx === messages.length - 1}
                      isStreaming={isStreaming}
                    />
                  </MessageContent>
                </Message>

                {/* Actions on last assistant message */}
                {message.role === "assistant" &&
                  idx === messages.length - 1 &&
                  !isStreaming && (
                    <MessageActions>
                      <MessageAction onClick={() => regenerate()} label="Retry">
                        <RefreshCcwIcon className="size-3" />
                      </MessageAction>
                      <MessageAction
                        onClick={() => {
                          const txt = message.parts
                            .filter((p) => p.type === "text")
                            .map((p) => p.text)
                            .join("");
                          navigator.clipboard.writeText(txt);
                        }}
                        label="Copy"
                      >
                        <CopyIcon className="size-3" />
                      </MessageAction>
                      <MessageAction
                        onClick={() => {
                          const txt = message.parts
                            .filter((p) => p.type === "text")
                            .map((p) => p.text)
                            .join("\n\n");

                          const blob = new Blob([txt], {
                            type: "text/markdown",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `report-${new Date().toISOString().split("T")[0]}.md`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        label="Export Markdown"
                      >
                        <DownloadIcon className="size-3" />
                      </MessageAction>
                    </MessageActions>
                  )}
              </Fragment>
            ))
          )}
          {isSubmitted && <Spinner />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* ── Prompt Input ── */}
      <div className="shrink-0 pt-3 border-t border-border/40">
        <PromptInput
          onSubmit={handleSubmit}
          className="w-full"
          accept="image/*,text/*,application/json,application/pdf,application/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.csv,.tsv,.xlsx,.xls,text/csv,text/tab-separated-values"
          onError={(err) => {
            toast.error(err.message, {
              description:
                err.code === "accept"
                  ? "Try .csv / .xlsx, or a type your browser reports correctly."
                  : undefined,
            });
          }}
          multiple
          globalDrop
        >
          {/* Attachment previews above input */}
          <PromptInputHeader>
            <PromptAttachments />
          </PromptInputHeader>

          {/* Textarea */}
          <PromptInputBody>
            <PromptInputTextarea
              value={text}
              placeholder={tab.placeholder}
              onChange={(e) => setText(e.target.value)}
            />
          </PromptInputBody>

          {/* Footer toolbar */}
          <PromptInputFooter>
            <PromptInputTools>
              {/* Attachment menu */}
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              {tab.id === "database" && (
                <Select
                  value={currentDatabaseId}
                  onValueChange={(v) => {
                    databaseTargetRef.current = v as DatabaseTargetId;
                    databaseUiTick();
                  }}
                >
                  <SelectTrigger
                    className="h-7 w-[min(20rem,100%)] min-w-0 max-w-sm shrink-0 items-center justify-between gap-2 border-border/50 bg-muted/30 pl-2 pr-1 **:data-[slot=select-value]:hidden"
                    title={`${currentDatabaseChoice.name} — ${currentDatabaseChoice.description}`}
                    aria-label={`${currentDatabaseChoice.name} (read-only). ${currentDatabaseChoice.description}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <DatabaseIcon
                        className="size-3.5 shrink-0 text-sky-400"
                        aria-hidden
                      />
                      <span className="line-clamp-1 text-left text-xs font-medium text-foreground">
                        {currentDatabaseChoice.name}
                      </span>
                    </div>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className="min-w-(--radix-select-trigger-width) max-w-sm"
                    position="popper"
                    sideOffset={4}
                  >
                    {DATABASE_TARGET_IDS.map((opt) => {
                      const c = DATABASE_CHOICES[opt];
                      return (
                        <SelectItem
                          key={opt}
                          value={opt}
                          className="h-auto min-h-12 items-start py-2 pr-6"
                        >
                          <div className="flex min-w-0 flex-col gap-0.5 text-left">
                            <span className="text-xs font-medium leading-tight text-foreground">
                              {c.name}
                            </span>
                            <span className="text-[10px] leading-snug text-muted-foreground">
                              {c.description}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              {/* Search indicator */}
              <PromptInputButton
                tooltip={{ content: "Web search is always enabled" }}
                variant="ghost"
                className={`${tab.accentColor} opacity-80`}
              >
                <GlobeIcon size={14} />
                <span className="text-xs">Search</span>
              </PromptInputButton>

              {/* PDF Summary Export */}
              {messages.length > 0 && (
                <PromptInputButton
                  onClick={async () => {
                    setIsSummaryDialogOpen(true);
                    setSummaryText("");
                    try {
                      const completionText = await startSummary("", {
                        body: { messages },
                      });
                      if (completionText) {
                        await handlePdfExport(completionText);
                      }
                    } catch (err) {
                      console.error("Summary failed:", err);
                    }
                  }}
                  tooltip={{ content: "Export comprehensive summary to PDF" }}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <DownloadIcon size={14} />
                  <span className="text-xs">Get Summary PDF</span>
                </PromptInputButton>
              )}
            </PromptInputTools>

            <PromptInputSubmit
              status={isStreaming ? "streaming" : "ready"}
              disabled={!text.trim() && status === "ready"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>

      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent className="sm:max-w-[600px] gap-0 p-0 border-border/60 bg-background/95 backdrop-blur shadow-2xl">
          <DialogHeader className="p-4 border-b border-border/40 bg-muted/20">
            <DialogTitle className="flex items-center gap-2">
              <DownloadIcon className="size-4 text-primary" />
              Generating PDF Summary...
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <ScrollArea className="h-[300px] w-full rounded-md border border-border/40 bg-card/30 p-4">
              <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed max-w-none">
                {summaryText ? (
                  <MessageResponse>{summaryText}</MessageResponse>
                ) : (
                  <p className="text-muted-foreground italic">
                    Analyzing conversation history...
                  </p>
                )}
                {isSummarizing && (
                  <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                    <Spinner /> Drafting markdown...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          {isExportingPdf && (
            <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-center gap-2 text-sm font-medium text-primary">
              <Spinner /> Converting to Light-Mode PDF...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Agent Component ──────────────────────────────────────────────────────

export default function Agent() {
  const [activeTab, setActiveTab] = useState<AgentTabId>("research");
  const [sessionIdByTab, setSessionIdByTab] = useState<
    Partial<Record<AgentTabId, Id<"agentChats">>>
  >({});
  const seedingEmptyListRef = useRef(false);

  useEffect(() => {
    seedingEmptyListRef.current = false;
  }, []);

  const createChat = useMutation(api.chats.createChat);
  const list = useQuery(api.chats.listByTab, { agentTab: activeTab });

  const activeConfig = TABS.find((t) => t.id === activeTab);
  const sessionId = sessionIdByTab[activeTab];
  const chatDoc = useQuery(
    api.chats.getOne,
    sessionId ? { id: sessionId } : "skip",
  );

  // Pick or create a session when switching agent tab
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally sync session per tab
  useEffect(() => {
    if (list === undefined) return;
    if (sessionIdByTab[activeTab]) return;
    if (list.length > 0) {
      setSessionIdByTab((s) => ({ ...s, [activeTab]: list[0]?._id }));
      return;
    }
    if (seedingEmptyListRef.current) return;
    seedingEmptyListRef.current = true;
    void createChat({ agentTab: activeTab, title: "New chat" })
      .then((id) => {
        setSessionIdByTab((s) => ({ ...s, [activeTab]: id }));
      })
      .finally(() => {
        seedingEmptyListRef.current = false;
      });
  }, [activeTab, list, sessionIdByTab, createChat]);

  const initialMessages: UIMessage[] = useMemo(() => {
    if (!chatDoc?.messagesJson) return [];
    try {
      return JSON.parse(chatDoc.messagesJson) as UIMessage[];
    } catch {
      return [];
    }
  }, [chatDoc?.messagesJson]);

  const canShowChat = sessionId && chatDoc !== undefined;

  if (activeConfig === undefined) {
    throw new Error(`Unknown agent tab: ${activeTab}`);
  }

  return (
    <div className="flex h-full min-h-0 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl">
      {/* ── Vertical tab sidebar ── */}
      <nav className="flex flex-col gap-1 p-2 border-r border-border/50 bg-background/40 w-52 shrink-0">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Agents
        </p>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              type="button"
              key={tab.id}
              id={`agent-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-start gap-3 w-full rounded-xl px-3 py-3 text-left transition-all duration-200
                ${isActive ? "bg-primary/10 shadow-sm" : "hover:bg-muted/50"}
              `}
            >
              <span
                className={`mt-0.5 shrink-0 ${isActive ? tab.accentColor : "text-muted-foreground"
                  }`}
              >
                {tab.icon}
              </span>
              <div>
                <p
                  className={`text-sm font-medium leading-tight ${isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                >
                  {tab.label}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {tab.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full border ${isActive
                          ? "border-primary/30 text-muted-foreground"
                          : "border-border/50 text-muted-foreground/60"
                        }`}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}

        <div className="mt-auto flex min-h-0 flex-col gap-2 border-t border-border/50 px-1.5 pt-2 pb-2">
          <UserAccountMenu popoverSide="right" popoverAlign="end" />
          <p className="px-1.5 text-[10px] text-muted-foreground/40 leading-snug">
            All agents have web search enabled. Drag &amp; drop files onto the
            input to upload.
          </p>
        </div>
      </nav>

      {/* ── Chat panel ── */}
      <div className="flex-1 min-w-0 flex flex-col p-4 gap-3">
        <div className="flex flex-col gap-2 shrink-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className={activeConfig.accentColor}>
              {activeConfig.icon}
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              {activeConfig.label} Agent
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={sessionId ?? ""}
              onValueChange={(v) => {
                if (v) {
                  setSessionIdByTab((s) => ({
                    ...s,
                    [activeTab]: v as Id<"agentChats">,
                  }));
                }
              }}
              disabled={!list?.length}
            >
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue placeholder="Session" />
              </SelectTrigger>
              <SelectContent>
                {(list ?? []).map((c: AgentChatDoc<"agentChats">) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                void createChat({
                  agentTab: activeTab,
                  title: "New chat",
                }).then((id) => {
                  setSessionIdByTab((s) => ({ ...s, [activeTab]: id }));
                });
              }}
            >
              New chat
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {!canShowChat ? (
            <div className="flex h-full items-center justify-center text-muted-foreground gap-2">
              <Spinner className="size-6" />
              <span className="text-sm">Loading session…</span>
            </div>
          ) : (
            <AgentChat
              key={sessionId}
              tab={activeConfig}
              sessionId={sessionId}
              initialMessages={initialMessages}
            />
          )}
        </div>
      </div>
    </div>
  );
}
