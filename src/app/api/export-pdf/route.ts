import { marked } from "marked";
import puppeteer from "puppeteer";

export async function POST(req: Request) {
  try {
    const { markdown } = await req.json();

    if (!markdown) {
      return new Response("Missing markdown content", { status: 400 });
    }

    // Parse markdown to HTML
    const htmlContent = await marked.parse(markdown);

    // Build the complete HTML document with styling
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2em; background-color: white; color: #111; }
          h1, h2, h3, h4, h5, h6 { color: #000; border-bottom: 1px solid #eaeaea; padding-bottom: 0.3em; }
          a { color: #0366d6; text-decoration: none; }
          code { font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; background-color: rgba(27,31,35,0.05); padding: 0.2em 0.4em; border-radius: 3px; }
          pre > code { background-color: transparent; padding: 0; }
          pre { background-color: #f6f8fa; padding: 16px; border-radius: 3px; overflow: auto; }
          blockquote { border-left: 0.25em solid #dfe2e5; color: #6a737d; padding: 0 1em; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      printBackground: true,
    });

    await browser.close();

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="summary-report.pdf"',
      },
    });
  } catch (error) {
    console.error("[export-pdf-route] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.stack || error.message : "Failed to generate PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
