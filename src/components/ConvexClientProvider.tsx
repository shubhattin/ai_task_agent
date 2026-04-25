"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

/**
 * `ConvexReactClient` throws if the address is empty. During `next build`, CI often has no
 * `NEXT_PUBLIC_CONVEX_URL`; use a placeholder so prerender (e.g. `/_not-found`) succeeds.
 * Set `NEXT_PUBLIC_CONVEX_URL` in the hosting build env (and `.env.local` locally) so
 * production points at your real deployment.
 */
const address =
  process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ||
  "https://build-placeholder.convex.cloud";

if (
  process.env.NODE_ENV === "development" &&
  !process.env.NEXT_PUBLIC_CONVEX_URL?.trim()
) {
  console.warn(
    "[Convex] NEXT_PUBLIC_CONVEX_URL is not set; add it to .env.local (Convex dashboard).",
  );
}

const convex = new ConvexReactClient(address);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
