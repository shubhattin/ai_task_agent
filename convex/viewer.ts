import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

/**
 * Profile for the signed-in user.
 *
 * Convex Auth persists Google (and other OAuth) profile fields on the `users`
 * table — not on `getUserIdentity()`, which is often only token metadata.
 * See: https://labs.convex.dev/auth/setup/schema
 */
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    const id = identity as Record<string, unknown> | null;

    const pickString = (o: Record<string, unknown> | null, key: string) => {
      const v = o?.[key];
      return typeof v === "string" && v.length > 0 ? v : null;
    };

    const name = user.name?.trim() || pickString(id, "name");
    const email = user.email?.trim() || pickString(id, "email");
    const picture =
      (typeof user.image === "string" && user.image ? user.image : null) ||
      pickString(id, "picture") ||
      pickString(id, "pictureUrl");

    return {
      name,
      email,
      picture,
    };
  },
});
