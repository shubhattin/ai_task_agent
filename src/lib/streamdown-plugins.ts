import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { createMathPlugin } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import rehypeKatex from "rehype-katex";
import type { Pluggable } from "unified";

const katexError = "var(--color-muted-foreground)";

/**
 * remark-math + rehype-katex. `output: "html"` avoids MathML (`<math>`) nodes, which
 * React/Streamdown can mishandle; visual output is the same (CSS in katex.min.css).
 */
const mathPlugin = (() => {
  const base = createMathPlugin({
    singleDollarTextMath: true,
    errorColor: katexError,
  });
  return {
    ...base,
    rehypePlugin: [
      rehypeKatex,
      {
        errorColor: katexError,
        output: "html" as const,
        strict: "ignore" as const,
      },
    ] as Pluggable,
  };
})();

/**
 * Shared Streamdown plugins for `MessageResponse`, `ReasoningContent`, and similar.
 * Load `katex/dist/katex.min.css` once in the app root.
 *
 * Math: `singleDollarTextMath` enables `$...$`; use `\$` for a literal dollar in prose.
 */
export const streamdownPlugins = {
  cjk,
  code,
  math: mathPlugin,
  mermaid,
} as const;
