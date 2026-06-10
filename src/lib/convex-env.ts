/** Convex deployment URL for client and server (Vite + legacy Next.js env names). */
export function getConvexUrl(): string {
  const vite = import.meta.env.VITE_CONVEX_URL?.trim();
  if (vite) return vite;

  const legacy =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CONVEX_URL?.trim()
      : undefined;
  if (legacy) return legacy;

  return "https://build-placeholder.convex.cloud";
}
