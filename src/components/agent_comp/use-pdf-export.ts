/** Builds and downloads PDF from streamed markdown summary. */
export async function exportMarkdownSummaryPdf(
  markdownText: string,
  tabLabel: string,
): Promise<void> {
  const { marked } = await import("marked");
  const htmlContent = await marked.parse(markdownText);

  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const htmlToPdfmake =
    (await import("html-to-pdfmake")).default ||
    (await import("html-to-pdfmake"));

  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const pdfFonts = pdfFontsModule.default || pdfFontsModule;

  (pdfMake as any).vfs = (pdfFonts as any).pdfMake
    ? (pdfFonts as any).pdfMake.vfs
    : (pdfFonts as any).vfs;

  const pdfContent = (htmlToPdfmake as any)(htmlContent, {
    defaultStyles: {
      a: { color: "#0366d6" },
      code: { background: "#f6f8fa" },
      pre: { background: "#f6f8fa", margin: [0, 10, 0, 15] },
      blockquote: { color: "#6a737d", margin: [15, 5, 0, 15] },
      p: { margin: [0, 0, 0, 12] },
      h1: { fontSize: 26, bold: true, margin: [0, 20, 0, 10] },
      h2: { fontSize: 22, bold: true, margin: [0, 16, 0, 8] },
      h3: { fontSize: 18, bold: true, margin: [0, 14, 0, 8] },
      h4: { fontSize: 14, bold: true, margin: [0, 12, 0, 6] },
      h5: { fontSize: 12, bold: true, margin: [0, 10, 0, 6] },
      h6: {
        fontSize: 12,
        bold: true,
        margin: [0, 10, 0, 6],
        color: "#6a737d",
      },
      ul: { margin: [10, 0, 0, 12] },
      ol: { margin: [10, 0, 0, 12] },
      li: { margin: [0, 0, 0, 4] },
      strong: { bold: true },
      em: { italics: true },
    },
  });

  const documentDefinition = {
    content: pdfContent,
    defaultStyle: {
      color: "#111111",
      lineHeight: 1.4,
    },
    pageMargins: [40, 40, 40, 40] as [number, number, number, number],
  };

  pdfMake
    .createPdf(documentDefinition)
    .download(`${tabLabel.toLowerCase()}-summary.pdf`);
}
