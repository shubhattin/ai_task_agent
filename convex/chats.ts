import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const agentTab = v.union(
  v.literal("research"),
  v.literal("data"),
  v.literal("database"),
);

export const listByTab = query({
  args: { agentTab: agentTab },
  handler: async (ctx, { agentTab: tab }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    const rows = await ctx.db
      .query("agentChats")
      .withIndex("by_user_and_tab", (q) =>
        q.eq("userId", userId).eq("agentTab", tab),
      )
      .collect();
    return rows.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 100);
  },
});

export const getOne = query({
  args: { id: v.id("agentChats") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) {
      return null;
    }
    return doc;
  },
});

export const createChat = mutation({
  args: {
    agentTab: agentTab,
    title: v.string(),
  },
  handler: async (ctx, { agentTab: tab, title }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const now = Date.now();
    return await ctx.db.insert("agentChats", {
      userId,
      agentTab: tab,
      title,
      messagesJson: "[]",
      updatedAt: now,
    });
  },
});

export const saveMessages = mutation({
  args: {
    id: v.id("agentChats"),
    messagesJson: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { id, messagesJson, title }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) {
      throw new Error("Not found");
    }
    await ctx.db.patch(id, {
      messagesJson,
      updatedAt: Date.now(),
      ...(title !== undefined ? { title } : {}),
    });
  },
});

export const removeChat = mutation({
  args: { id: v.id("agentChats") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) {
      throw new Error("Not found");
    }
    await ctx.db.delete(id);
  },
});
