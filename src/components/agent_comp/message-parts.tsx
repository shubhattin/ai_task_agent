"use client";

import type { UIMessage } from "ai";
import {
  DatabaseIcon,
  GlobeIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react";
import type { ReactNode } from "react";
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
import { MessageResponse } from "@/components/ai-elements/message";
import { usePromptInputAttachments } from "@/components/ai-elements/prompt-input";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getCodeInterpreterSessionDescription,
  getCodeInterpreterStepLabel,
  getWebSearchResultUrls,
  getWebSearchStepLabel,
  truncateDisplayText,
} from "./tool-helpers";
import type {
  CodeInterpreterToolInput,
  CodeInterpreterToolOutput,
  SqlQueryToolInput,
  SqlQueryToolOutput,
  ToolPartLike,
} from "./types";

export function SourceStrip({ message }: { message: UIMessage }) {
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

export function PromptAttachments() {
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

export function shouldSkipMessagePart(p: UIMessage["parts"][number]): boolean {
  return (
    p.type === "source-url" || p.type === "step-start" || p.type === "file"
  );
}

export function renderToolStepsForChain(
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

export function MessageParts({
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

  const out: ReactNode[] = [];
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
