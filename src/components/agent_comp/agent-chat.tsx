"use client";

import { useChat, useCompletion } from "@ai-sdk/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAuthToken } from "@convex-dev/auth/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { DatabaseTargetId } from "@/lib/agents/database/info";
import { getConvexHttpSiteUrl } from "@/lib/convex-site";
import { AgentConversation } from "./agent-conversation";
import { AgentPromptPanel } from "./agent-prompt-panel";
import { deriveChatTitle } from "./chat-utils";
import { SummaryPdfDialog } from "./summary-pdf-dialog";
import type { TabConfig } from "./types";
import { exportMarkdownSummaryPdf } from "./use-pdf-export";

export function AgentChat({
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
  const [databaseTarget, setDatabaseTarget] = useState<DatabaseTargetId>("2");

  const token = useAuthToken();
  const saveMessagesM = useMutation(api.chats.saveMessages);

  const databaseChatBody = useMemo(
    () => ({
      get database(): DatabaseTargetId {
        return databaseTarget;
      },
    }),
    [databaseTarget],
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

  const handlePdfExport = async (markdownText: string) => {
    setIsExportingPdf(true);
    try {
      await exportMarkdownSummaryPdf(markdownText, tab.label);
      setIsSummaryDialogOpen(false);
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
      <AgentConversation
        messages={messages}
        tab={tab}
        isStreaming={isStreaming}
        isSubmitted={isSubmitted}
        regenerate={regenerate}
      />

      <AgentPromptPanel
        tab={tab}
        text={text}
        onTextChange={setText}
        onSubmit={handleSubmit}
        status={status}
        isStreaming={isStreaming}
        messages={messages}
        databaseTarget={databaseTarget}
        onDatabaseTargetChange={setDatabaseTarget}
        onGetSummaryPdf={async () => {
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
      />

      <SummaryPdfDialog
        open={isSummaryDialogOpen}
        onOpenChange={setIsSummaryDialogOpen}
        summaryText={summaryText}
        isSummarizing={isSummarizing}
        isExportingPdf={isExportingPdf}
      />
    </div>
  );
}
