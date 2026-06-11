import { getConvexUrl } from "./convex-env";

/** HTTP actions base (e.g. https://deployment.convex.site). */
export function getConvexHttpSiteUrl(): string {
  const cloud = getConvexUrl();
  if (!cloud || cloud === "https://build-placeholder.convex.cloud") return "";
  return cloud.replace(/\.convex\.cloud\b/i, ".convex.site");
}
