"use client";

import { useState, Fragment } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
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
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputButton,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Spinner } from "@/components/ui/spinner";
import {
  RefreshCcwIcon,
  CopyIcon,
  SearchIcon,
  DatabaseIcon,
  BarChart3Icon,
  GlobeIcon,
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
    description: "Deep-dives any topic using multi-step web search and synthesis.",
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
    capabilities: ["CSV / Excel analysis", "Statistical insights", "Trend detection"],
  },
  {
    id: "database",
    label: "Database",
    icon: <DatabaseIcon className="size-4" />,
    description:
      "Provide your DB schema and get optimised multi-step SQL queries generated for you.",
    placeholder:
      "Paste your schema and describe the data you need to fetch…",
    apiPath: "/api/database",
    accentColor: "text-sky-400",
    capabilities: ["Schema understanding", "Multi-step SQL", "Query optimisation"],
  },
];

// ─── Message Parts renderer ────────────────────────────────────────────────────

function MessageParts({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
}) {
  const reasoningParts = message.parts.filter((p) => p.type === "reasoning");
  const reasoningText = reasoningParts.map((p) => p.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;
  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === "reasoning";

  return (
    <>
      {hasReasoning && (
        <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      )}

      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;
        switch (part.type) {
          case "text":
            return (
              <MessageResponse key={key}>{part.text}</MessageResponse>
            );

          default:
            // Handle all tool-* parts generically
            if (part.type.startsWith("tool-")) {
              const toolPart = part as {
                type: string;
                state: string;
                input?: unknown;
                output?: unknown;
                errorText?: string;
              };
              return (
                <Tool key={key}>
                  <ToolHeader
                    type={toolPart.type as `tool-${string}`}
                    state={toolPart.state as Parameters<typeof ToolHeader>[0]["state"]}
                  />
                  <ToolContent>
                    {toolPart.input !== undefined && (
                      <ToolInput input={toolPart.input} />
                    )}
                    {(toolPart.state === "output-available" ||
                      toolPart.state === "output-error") && (
                      <ToolOutput
                        output={
                          toolPart.output !== undefined ? (
                            <MessageResponse>
                              {typeof toolPart.output === "string"
                                ? toolPart.output
                                : JSON.stringify(toolPart.output, null, 2)}
                            </MessageResponse>
                          ) : undefined
                        }
                        errorText={toolPart.errorText}
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }
            return null;
        }
      })}
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
    if (!msg.text.trim()) return;
    sendMessage({ text: msg.text });
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Conversation area */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <span className={`${tab.accentColor}`}>{tab.icon}</span>
              }
              title={`${tab.label} Agent`}
              description={tab.description}
            />
          ) : (
            messages.map((message, idx) => (
              <Fragment key={message.id}>
                <Message from={message.role}>
                  <MessageContent>
                    <MessageParts
                      message={message}
                      isLastMessage={idx === messages.length - 1}
                      isStreaming={isStreaming}
                    />
                  </MessageContent>
                </Message>

                {message.role === "assistant" &&
                  idx === messages.length - 1 && (
                    <MessageActions>
                      <MessageAction
                        onClick={() => regenerate()}
                        label="Retry"
                      >
                        <RefreshCcwIcon className="size-3" />
                      </MessageAction>
                      <MessageAction
                        onClick={() => {
                          const text = message.parts
                            .filter((p) => p.type === "text")
                            .map((p) => p.text)
                            .join("");
                          navigator.clipboard.writeText(text);
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

      {/* Input area */}
      <div className="flex-shrink-0 pt-3 border-t border-border/50">
        <PromptInput onSubmit={handleSubmit} className="w-full" multiple>
          <PromptInputBody>
            <PromptInputTextarea
              value={text}
              placeholder={tab.placeholder}
              onChange={(e) => setText(e.target.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton
                tooltip="Web search enabled"
                variant="ghost"
                className={`${tab.accentColor} opacity-70`}
              >
                <GlobeIcon size={14} />
                <span className="text-xs">Search enabled</span>
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
      {/* Vertical tab sidebar */}
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
                ${
                  isActive
                    ? "bg-primary/10 shadow-sm"
                    : "hover:bg-muted/50"
                }
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

        {/* Bottom hint */}
        <div className="mt-auto px-3 py-3">
          <p className="text-[10px] text-muted-foreground/40 leading-snug">
            All agents have web search enabled by default.
          </p>
        </div>
      </nav>

      {/* Chat panel */}
      <div className="flex-1 min-w-0 flex flex-col p-4 gap-3">
        {/* Tab header */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={activeConfig.accentColor}>{activeConfig.icon}</span>
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
