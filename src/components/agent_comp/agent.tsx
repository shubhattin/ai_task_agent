"use client";

import { api } from "@convex/_generated/api";
import type { Doc as AgentChatDoc, Id } from "@convex/_generated/dataModel";
import type { UIMessage } from "ai";
import { useMutation, useQuery } from "convex/react";
import { Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { UserAccountMenu } from "@/components/UserAccountMenu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AgentChat } from "./agent-chat";
import { TABS } from "./tab-config";
import type { AgentTabId } from "./types";

export default function Agent() {
  const [activeTab, setActiveTab] = useState<AgentTabId>("research");
  const [sessionIdByTab, setSessionIdByTab] = useState<
    Partial<Record<AgentTabId, Id<"agentChats">>>
  >({});
  const seedingEmptyListRef = useRef(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  useEffect(() => {
    seedingEmptyListRef.current = false;
  }, []);

  const createChat = useMutation(api.chats.createChat);
  const removeChatMutation = useMutation(api.chats.removeChat);
  const list = useQuery(api.chats.listByTab, { agentTab: activeTab });

  const activeConfig = TABS.find((t) => t.id === activeTab);
  const sessionId = sessionIdByTab[activeTab];
  const chatDoc = useQuery(
    api.chats.getOne,
    sessionId ? { id: sessionId } : "skip",
  );

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

  const handleConfirmDeleteChat = async () => {
    if (!sessionId) return;
    setIsDeletingChat(true);
    try {
      await removeChatMutation({ id: sessionId });
      setSessionIdByTab((s) => {
        const next = { ...s };
        delete next[activeTab];
        return next;
      });
      setDeleteDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Could not delete this chat.");
    } finally {
      setIsDeletingChat(false);
    }
  };

  const canDeleteCurrentChat = Boolean(sessionId && list?.length);

  return (
    <div className="flex h-full min-h-0 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl">
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
                className={`mt-0.5 shrink-0 ${
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

        <div className="mt-auto flex min-h-0 flex-col gap-2 border-t border-border/50 px-1.5 pt-2 pb-2">
          <UserAccountMenu popoverSide="right" popoverAlign="end" />
          <p className="px-1.5 text-[10px] text-muted-foreground/40 leading-snug">
            All agents have web search enabled. Drag &amp; drop files onto the
            input to upload.
          </p>
        </div>
      </nav>

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={!canDeleteCurrentChat || isDeletingChat}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="max-sm:sr-only">Delete chat</span>
            </Button>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the conversation from your history for this agent.
                You cannot undo this.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingChat}>
                Cancel
              </AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeletingChat}
                onClick={() => void handleConfirmDeleteChat()}
              >
                {isDeletingChat ? "Deleting…" : "Delete chat"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
