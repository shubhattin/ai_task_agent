import type { UIMessage } from "ai";

export function deriveChatTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const textPart = first.parts?.find((p) => p.type === "text");
  const text = textPart && textPart.type === "text" ? textPart.text.trim() : "";
  if (!text) return "New chat";
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}
