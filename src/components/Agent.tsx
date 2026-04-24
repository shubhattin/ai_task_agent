"use client";

import { useState, Fragment } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";

// ─── AI Elements ───────────────────────────────────────────────────────────────
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputHeader,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputButton,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ai-elements/chain-of-thought";
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
import { Spinner } from "@/components/ui/spinner";

// ─── Icons ─────────────────────────────────────────────────────────────────────
import {
  RefreshCcwIcon,
  CopyIcon,
  SearchIcon,
  DatabaseIcon,
  BarChart3Icon,
  GlobeIcon,
  BrainIcon,
  SparklesIcon,
} from "lucide-react";

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
      "Provide your DB schema and get optimised multi-step SQL queries generated for you.",
    placeholder: "Paste your schema and describe the data you need to fetch…",
    apiPath: "/api/database",
    accentColor: "text-sky-400",
    capabilities: [
      "Schema understanding",
      "Multi-step SQL",
      "Query optimisation",
    ],
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type WebSearchOutput = {
  results?: Array<{ title?: string; url?: string }>;
};

type ToolPartLike = {
  type: string;
  state: string;
  input?: unknown;
  output?: unknown;
};

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

/**
 * Renders all parts of a message using the appropriate ai-elements:
 *
 *  • reasoning       → Reasoning collapsible (auto-open while streaming)
 *  • tool-webSearch   → ChainOfThought step with query + domain badges
 *  • other tool-*     → ChainOfThought generic step
 *  • source-url       → handled separately by SourceStrip
 *  • text             → MessageResponse (markdown)
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
  // Split parts by type
  const textParts = message.parts.filter((p) => p.type === "text");
  const reasoningParts = message.parts.filter((p) => p.type === "reasoning");
  const toolParts = message.parts.filter((p) => p.type.startsWith("tool-"));
  const hasThinking = toolParts.length > 0;

  // Reasoning
  const hasReasoning = reasoningParts.length > 0;
  const reasoningText = reasoningParts.map((p) => p.text).join("\n\n");
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === "reasoning";

  // Is the agent still in its tool-call loop?
  const stillRunning =
    isLastMessage && isStreaming && lastPart?.type !== "text";

  return (
    <>
      {/* ── Reasoning trace (collapsible, Reasoning component) ── */}
      {hasReasoning && (
        <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      )}

      {/* ── Chain-of-thought for tool steps ── */}
      {hasThinking && (
        <ChainOfThought defaultOpen={stillRunning} className="w-full mb-2">
          <ChainOfThoughtHeader>
            {stillRunning ? "Working…" : "Steps taken"}
          </ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            {toolParts.map((part, i) => {
              // ── Web Search step ────────────────────────────────────────
              if (part.type === "tool-webSearch") {
                const tool = part as ToolPartLike;
                const input = tool.input as { query?: string } | undefined;
                const output = tool.output as WebSearchOutput | undefined;
                const query = input?.query ?? "searching…";
                const done =
                  tool.state === "output-available" ||
                  tool.state === "output-error";
                const urls = (output?.results ?? [])
                  .map((r) => r.url)
                  .filter(Boolean) as string[];

                return (
                  <ChainOfThoughtStep
                    key={`${message.id}-s-${i}`}
                    icon={GlobeIcon}
                    label={`Searched "${query}"`}
                    status={done ? "complete" : "active"}
                  >
                    {urls.length > 0 && (
                      <ChainOfThoughtSearchResults>
                        {urls.slice(0, 6).map((url) => {
                          let host = url;
                          try {
                            host = new URL(url).hostname.replace(
                              /^www\./,
                              ""
                            );
                          } catch {}
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

              // ── Any other tool step ────────────────────────────────────
              if (part.type.startsWith("tool-")) {
                const tool = part as ToolPartLike;
                const done =
                  tool.state === "output-available" ||
                  tool.state === "output-error";
                const name = part.type
                  .replace("tool-", "")
                  .replace(/([A-Z])/g, " $1")
                  .replace(/-/g, " ")
                  .trim();
                return (
                  <ChainOfThoughtStep
                    key={`${message.id}-t-${i}`}
                    icon={SparklesIcon}
                    label={name}
                    status={done ? "complete" : "active"}
                  />
                );
              }

              return null;
            })}
          </ChainOfThoughtContent>
        </ChainOfThought>
      )}

      {/* ── Final text response ── */}
      {textParts.map((part, i) => (
        <MessageResponse key={`${message.id}-text-${i}`}>
          {part.text}
        </MessageResponse>
      ))}
    </>
  );
}

// ─── Single Agent Chat Panel ───────────────────────────────────────────────────

function AgentChat({ tab }: { tab: TabConfig }) {
  const [text, setText] = useState("");

  const { messages, sendMessage, status, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: tab.apiPath }),
  });

  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";

  const handleSubmit = (msg: PromptInputMessage) => {
    const hasText = Boolean(msg.text?.trim());
    const hasFiles = Boolean(msg.files?.length);
    if (!hasText && !hasFiles) return;
    sendMessage({
      text: msg.text || "Sent with attachments",
      files: msg.files,
    });
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
                    {message.role === "user" && (() => {
                      const fileParts = message.parts.filter(
                        (p) => p.type === "file"
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
                      <MessageAction
                        onClick={() => regenerate()}
                        label="Retry"
                      >
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
      <div className="flex-shrink-0 pt-3 border-t border-border/40">
        <PromptInput
          onSubmit={handleSubmit}
          className="w-full"
          accept=".csv,.xlsx,.xls,.json,.txt,.pdf,.png,.jpg,.jpeg,.gif,.webp"
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

              {/* Search indicator */}
              <PromptInputButton
                tooltip={{ content: "Web search is always enabled" }}
                variant="ghost"
                className={`${tab.accentColor} opacity-80`}
              >
                <GlobeIcon size={14} />
                <span className="text-xs">Search</span>
              </PromptInputButton>
            </PromptInputTools>

            <PromptInputSubmit
              status={isStreaming ? "streaming" : "ready"}
              disabled={!text.trim() && status === "ready"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

// ─── Main Agent Component ──────────────────────────────────────────────────────

export default function Agent() {
  const [activeTab, setActiveTab] = useState<AgentTabId>("research");
  const activeConfig = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="flex h-full min-h-0 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl">
      {/* ── Vertical tab sidebar ── */}
      <nav className="flex flex-col gap-1 p-2 border-r border-border/50 bg-background/40 w-52 flex-shrink-0">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Agents
        </p>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              id={`agent-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-start gap-3 w-full rounded-xl px-3 py-3 text-left transition-all duration-200
                ${isActive ? "bg-primary/10 shadow-sm" : "hover:bg-muted/50"}
              `}
            >
              <span
                className={`mt-0.5 flex-shrink-0 ${
                  isActive ? tab.accentColor : "text-muted-foreground"
                }`}
              >
                {tab.icon}
              </span>
              <div>
                <p
                  className={`text-sm font-medium leading-tight ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {tab.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full border ${
                        isActive
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

        <div className="mt-auto px-3 py-3">
          <p className="text-[10px] text-muted-foreground/40 leading-snug">
            All agents have web search enabled. Drag &amp; drop files onto the
            input to upload.
          </p>
        </div>
      </nav>

      {/* ── Chat panel ── */}
      <div className="flex-1 min-w-0 flex flex-col p-4 gap-3">
        {/* Tab header */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={activeConfig.accentColor}>
            {activeConfig.icon}
          </span>
          <h3 className="text-sm font-semibold text-foreground">
            {activeConfig.label} Agent
          </h3>
          <span className="ml-auto text-xs text-muted-foreground/60 bg-muted/40 px-2 py-0.5 rounded-full">
            GPT-5.4 · Medium Reasoning
          </span>
        </div>

        {/* Agent chat — key forces remount when tab changes */}
        <div className="flex-1 min-h-0">
          <AgentChat key={activeTab} tab={activeConfig} />
        </div>
      </div>
    </div>
  );
}
