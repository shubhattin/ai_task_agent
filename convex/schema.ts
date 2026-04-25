import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  agentChats: defineTable({
    userId: v.id("users"),
    agentTab: v.union(
      v.literal("research"),
      v.literal("data"),
      v.literal("database"),
    ),
    title: v.string(),
    messagesJson: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user_and_tab", ["userId", "agentTab"])
    .index("by_user", ["userId"]),
});
