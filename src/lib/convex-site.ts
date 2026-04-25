/** HTTP actions base (e.g. https://deployment.convex.site). */
export function getConvexHttpSiteUrl(): string {
  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!cloud) return "";
  return cloud.replace(/\.convex\.cloud\b/i, ".convex.site");
}
