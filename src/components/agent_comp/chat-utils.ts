import type { UIMessage } from "ai";

/** True when the Convex chat has no messages (or invalid / missing JSON). */
export function isMessagesJsonEmpty(messagesJson: string | undefined): boolean {
  if (!messagesJson) return true;
  try {
    const parsed = JSON.parse(messagesJson) as unknown;
    return !Array.isArray(parsed) || parsed.length === 0;
  } catch {
    return true;
  }
}

export function deriveChatTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const textPart = first.parts?.find((p) => p.type === "text");
  const text = textPart && textPart.type === "text" ? textPart.text.trim() : "";
  if (!text) return "New chat";
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}
