/**
 * Normalize assistant markdown so remark-math + rehype-katex parse it reliably, including
 * while the model is still streaming (unclosed `$$` would otherwise stay plain text).
 *
 * - `\( \)` and `\[ \]` → `$` / `$$` (common model output; remark-math expects `$` / `$$`)
 * - `[ ... ]` with TeX (models often do this) → `$` / `$$` (heuristic; see inner normalizer)
 * - Odd number of `$$` at end of a chunk: append a closing `$$` for partial display math
 * - Unclosed single `$` only when the fragment after it looks like LaTeX (avoids bare `$5`)
 *
 * Fences: math fixes run only **outside** ``` fenced blocks.
 */

function convertLatexParenthesisDelimiters(markdown: string): string {
  if (!markdown) return markdown;
  return markdown
    .replace(
      /\\\(([\s\S]*?)\\\)/g,
      (_, inner: string) => `$${(inner as string).trim()}$`,
    )
    .replace(
      /\\\[([\s\S]*?)\\\]/g,
      (_, inner: string) => `\n$$\n${(inner as string).trim()}\n$$\n`,
    );
}

function closeIncompleteDisplayDoubleDollars(s: string): string {
  const n = (s.match(/\$\$/g) ?? []).length;
  if (n % 2 === 1) {
    return s + "\n$$";
  }
  return s;
}

/**
 * When inline math was opened with `$` and never closed, only auto-close if the
 * tail looks like LaTeX (not e.g. a currency-like fragment).
 */
function closeIncompleteSingleDollarIfLatex(s: string): string {
  let inDisplay = false;
  let inInline = false;
  let i = 0;
  let lastSingleOpen = -1;
  while (i < s.length) {
    if (s[i] === "\\" && i + 1 < s.length) {
      i += 2;
      continue;
    }
    if (i < s.length - 1 && s.slice(i, i + 2) === "$$") {
      inDisplay = !inDisplay;
      if (inDisplay) inInline = false;
      i += 2;
      continue;
    }
    if (s[i] === "$" && !inDisplay) {
      if (inInline) {
        inInline = false;
        lastSingleOpen = -1;
      } else {
        inInline = true;
        lastSingleOpen = i;
      }
    }
    i += 1;
  }
  if (inInline && lastSingleOpen >= 0) {
    const tail = s.slice(lastSingleOpen + 1);
    if (tail.length > 0 && (/\\[a-zA-Z@*]/.test(tail) || /[\^_{]/.test(tail))) {
      return s + "$";
    }
  }
  return s;
}

function withOutsideCodeFences(
  markdown: string,
  fn: (s: string) => string,
): string {
  const parts = markdown.split("```");
  for (let k = 0; k < parts.length; k += 2) {
    parts[k] = fn(parts[k] ?? "");
  }
  return parts.join("```");
}

function normalizeAssistantMathDelimitersInner(markdown: string): string {
  if (!markdown) return markdown;

  let t = markdown.replace(
    /^(\s*)\[([\s\S]+)\]\s*$/gm,
    (full, indent: string, inner: string) => {
      const body = inner.trim();
      if (!/\\[a-zA-Z@*]+/.test(body)) return full;
      return `${indent}$$${body}$$`;
    },
  );

  t = t.replace(/\[([\s\S]*?)\](?!\()/g, (full, inner: string) => {
    const body = inner.trim();
    if (body.length < 2) return full;
    if (!/\\[a-zA-Z@*]/.test(body)) return full;
    return `$${body}$`;
  });

  return t;
}

/**
 * Full pipeline for Streamdown: apply all normalizers; safe to use on every render / stream chunk.
 */
export function prepareAssistantMarkdownForMath(markdown: string): string {
  if (typeof markdown !== "string" || !markdown) {
    return markdown;
  }
  return withOutsideCodeFences(markdown, (chunk) => {
    let s = convertLatexParenthesisDelimiters(chunk);
    s = normalizeAssistantMathDelimitersInner(s);
    s = closeIncompleteDisplayDoubleDollars(s);
    s = closeIncompleteSingleDollarIfLatex(s);
    return s;
  });
}

/**
 * @deprecated same as {@link prepareAssistantMarkdownForMath}; kept for existing imports.
 */
export function normalizeAssistantMathDelimiters(markdown: string): string {
  return prepareAssistantMarkdownForMath(markdown);
}
