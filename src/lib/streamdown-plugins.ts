import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { createMathPlugin } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";

/**
 * Shared Streamdown plugins for `MessageResponse`, `ReasoningContent`, and similar.
 * Load `katex/dist/katex.min.css` once in the app root.
 *
 * Math: remark-math + rehype-katex. `singleDollarTextMath` enables `$...$`; use `\$` for a literal dollar in prose.
 */
export const streamdownPlugins = {
  cjk,
  code,
  math: createMathPlugin({
    singleDollarTextMath: true,
    errorColor: "var(--color-muted-foreground)",
  }),
  mermaid,
} as const;
