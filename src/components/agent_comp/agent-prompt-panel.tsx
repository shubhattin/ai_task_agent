"use client";

import type { UIMessage } from "ai";
import { DatabaseIcon, DownloadIcon, GlobeIcon } from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ai-elements/prompt-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATABASE_CHOICES,
  DATABASE_TARGET_IDS,
  type DatabaseTargetId,
} from "@/lib/agents/database/info";
import { PromptAttachments } from "./message-parts";
import type { TabConfig } from "./types";

export function AgentPromptPanel({
  tab,
  text,
  onTextChange,
  onSubmit,
  status,
  isStreaming,
  messages,
  databaseTarget,
  onDatabaseTargetChange,
  onGetSummaryPdf,
}: {
  tab: TabConfig;
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: (msg: PromptInputMessage) => void;
  status: string;
  isStreaming: boolean;
  messages: UIMessage[];
  databaseTarget: DatabaseTargetId;
  onDatabaseTargetChange: (id: DatabaseTargetId) => void;
  onGetSummaryPdf: () => void | Promise<void>;
}) {
  const currentChoice = DATABASE_CHOICES[databaseTarget];

  return (
    <div className="shrink-0 pt-3 border-t border-border/40">
      <PromptInput
        onSubmit={onSubmit}
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
        <PromptInputHeader>
          <PromptAttachments />
        </PromptInputHeader>

        <PromptInputBody>
          <PromptInputTextarea
            value={text}
            placeholder={tab.placeholder}
            onChange={(e) => onTextChange(e.target.value)}
          />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>

            {tab.id === "database" && (
              <Select
                value={databaseTarget}
                onValueChange={(v) =>
                  onDatabaseTargetChange(v as DatabaseTargetId)
                }
              >
                <SelectTrigger
                  className="h-7 w-[min(20rem,100%)] min-w-0 max-w-sm shrink-0 items-center justify-between gap-2 border-border/50 bg-muted/30 pl-2 pr-1 **:data-[slot=select-value]:hidden"
                  title={`${currentChoice.name} — ${currentChoice.description}`}
                  aria-label={`${currentChoice.name} (read-only). ${currentChoice.description}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <DatabaseIcon
                      className="size-3.5 shrink-0 text-sky-400"
                      aria-hidden
                    />
                    <span className="line-clamp-1 text-left text-xs font-medium text-foreground">
                      {currentChoice.name}
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

            <PromptInputButton
              tooltip={{ content: "Web search is always enabled" }}
              variant="ghost"
              className={`${tab.accentColor} opacity-80`}
            >
              <GlobeIcon size={14} />
              <span className="text-xs">Search</span>
            </PromptInputButton>

            {messages.length > 0 && (
              <PromptInputButton
                onClick={() => {
                  void onGetSummaryPdf();
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
  );
}
