"use client";

import type { UIMessage } from "ai";
import { CopyIcon, DownloadIcon, RefreshCcwIcon } from "lucide-react";
import { Fragment } from "react";
import {
  Attachment,
  AttachmentPreview,
  Attachments,
} from "@/components/ai-elements/attachments";
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
} from "@/components/ai-elements/message";
import { Spinner } from "@/components/ui/spinner";
import { MessageParts, SourceStrip } from "./message-parts";
import type { TabConfig } from "./types";

export function AgentConversation({
  messages,
  tab,
  isStreaming,
  isSubmitted,
  regenerate,
}: {
  messages: UIMessage[];
  tab: TabConfig;
  isStreaming: boolean;
  isSubmitted: boolean;
  regenerate: () => void;
}) {
  return (
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
              {message.role === "assistant" && (
                <SourceStrip message={message} />
              )}

              <Message from={message.role}>
                <MessageContent>
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
  );
}
