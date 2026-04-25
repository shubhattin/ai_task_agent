import type { UIMessage } from "ai";

const TABULAR_MEDIA = new Set([
  "text/csv",
  "application/csv",
  "text/tab-separated-values",
]);

const MAX_INLINED = 1_200_000;

function isTabularFilePart(part: { type: string; mediaType: string; filename?: string }): boolean {
  if (part.type !== "file") return false;
  const m = (part.mediaType || "").toLowerCase();
  const name = (part.filename || "").toLowerCase();
  if (TABULAR_MEDIA.has(m)) return true;
  if (name.endsWith(".csv") || name.endsWith(".tsv")) {
    if (
      m === "text/plain" ||
      m === "application/octet-stream" ||
      m === "application/vnd.ms-excel" ||
      m === ""
    ) {
      return true;
    }
  }
  return false;
}

async function readUrlAsUtf8(url: string): Promise<string> {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    if (comma === -1) {
      throw new Error("Invalid data URL");
    }
    const header = url.slice(5, comma);
    const data = url.slice(comma + 1);
    if (/\bbase64\b/i.test(header)) {
      return Buffer.from(data, "base64").toString("utf-8");
    }
    return decodeURIComponent(data);
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const r = await fetch(url);
    if (!r.ok) {
      throw new Error(`Failed to fetch file: ${r.status}`);
    }
    return r.text();
  }
  if (url.startsWith("blob:")) {
    throw new Error(
      "Blob URLs are not available on the server; the client should send a data URL.",
    );
  }
  throw new Error("Unsupported file URL for tabular inlining");
}

function asTextPart(
  body: string,
  filename: string,
  wasTruncated: boolean,
): { type: "text"; text: string } {
  const head = wasTruncated
    ? `_(The following attachment \`${filename}\` was truncated to ${MAX_INLINED} characters; ask the user for a smaller file or a subset of rows if needed.)_\n\n`
    : "";
  return {
    type: "text",
    text: `${head}**Attached data file: \`${filename}\`**\n\`\`\`csv\n${body}\n\`\`\``,
  };
}

/**
 * The OpenAI chat / Responses path used by the AI SDK rejects user **file** parts for
 * `text/csv` (and similar) media types. Inline the contents as a **text** part so the
 * model and code-interpreter can still use the data. Binary Excel should remain as file
 * parts (or be converted on the client separately).
 */
export async function coerceTabularFilePartsToText(
  messages: UIMessage[],
): Promise<UIMessage[]> {
  const out: UIMessage[] = [];
  for (const msg of messages) {
    if (!("parts" in msg) || !Array.isArray(msg.parts)) {
      out.push(msg);
      continue;
    }
    const parts: UIMessage["parts"] = [];
    for (const part of msg.parts) {
      if (
        typeof part === "object" &&
        part != null &&
        "type" in part &&
        part.type === "file" &&
        "url" in part &&
        "mediaType" in part &&
        isTabularFilePart(
          part as { type: string; mediaType: string; filename?: string; url: string },
        )
      ) {
        const f = part as { url: string; mediaType: string; filename?: string };
        const filename = f.filename || "data.csv";
        try {
          let text = await readUrlAsUtf8(f.url);
          let wasTruncated = false;
          if (text.length > MAX_INLINED) {
            text = text.slice(0, MAX_INLINED);
            wasTruncated = true;
          }
          parts.push(asTextPart(text, filename, wasTruncated) as UIMessage["parts"][number]);
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          parts.push({
            type: "text",
            text: `_(Could not read attached file \`${filename}\` on the server: ${err}.)_`,
          } as UIMessage["parts"][number]);
        }
      } else {
        parts.push(part);
      }
    }
    out.push({ ...msg, parts } as UIMessage);
  }
  return out;
}
