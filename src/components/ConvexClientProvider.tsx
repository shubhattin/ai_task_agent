import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { getConvexUrl } from "@/lib/convex-env";

/**
 * `ConvexReactClient` throws if the address is empty. During production builds,
 * CI often has no `VITE_CONVEX_URL`; use a placeholder so prerender succeeds.
 * Set `VITE_CONVEX_URL` in the hosting build env (and `.env.local` locally) so
 * production points at your real deployment. `npx convex dev` writes this for Vite.
 */
const address = getConvexUrl();

if (import.meta.env.DEV && !import.meta.env.VITE_CONVEX_URL?.trim()) {
  console.warn(
    "[Convex] VITE_CONVEX_URL is not set; add it to .env.local (Convex dashboard).",
  );
}

const convex = new ConvexReactClient(address);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
