/** The parts of a pdf.js text item used to rebuild lines and paragraphs. */
export interface PdfTextItem {
  str: string;
  hasEOL: boolean;
  /** [a, b, c, d, x, y]: y is the baseline, growing upwards. */
  transform: number[];
  height: number;
}

interface Line {
  text: string;
  y: number;
  height: number;
}

/**
 * Joins the text of each page into plain text: wrapped lines become one paragraph, and a blank line,
 * a large vertical gap or a jump upwards (new column) starts a new one. Pages are separate paragraphs.
 */
export function pdfItemsToText(pages: PdfTextItem[][]): string {
  return pages.map(pageToText).filter(Boolean).join('\n');
}

function pageToText(items: PdfTextItem[]): string {
  const lines: Line[] = [];
  let current: Line | null = null;
  for (const item of items) {
    current ??= { text: '', y: item.transform[5], height: 0 };
    current.text += item.str;
    current.height = Math.max(current.height, item.height);
    if (item.hasEOL) {
      lines.push(current);
      current = null;
    }
  }
  if (current) lines.push(current);

  let out = '';
  let previous: Line | null = null;
  let blankLine = false;
  for (const line of lines) {
    const text = line.text.replace(/\s+/g, ' ').trim();
    if (!text) {
      blankLine = true;
      continue;
    }
    if (previous) {
      const gap = previous.y - line.y;
      const lineHeight = Math.max(previous.height, line.height) || 12;
      if (blankLine || gap < 0 || gap > lineHeight * 1.8) {
        out += '\n';
      } else if (/\p{L}-$/u.test(out)) {
        // ponytail: assumes a hyphen at the end of a line splits one word, so compounds that wrap
        // at their own hyphen (e.g. "guarda-chuva") lose it.
        out = out.slice(0, -1);
      } else {
        out += ' ';
      }
    }
    out += text;
    previous = line;
    blankLine = false;
  }
  return out;
}

/** Thrown with a message ready to show the reader. */
export class PdfImportError extends Error {}

/** Extracts the text of a PDF in the browser. pdf.js is loaded only when this is called. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  // Copied to the site root by angular.json; same package version as the API, as pdf.js requires.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', document.baseURI).href;

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let pdf;
  try {
    pdf = await task.promise;
  } catch (error) {
    await task.destroy();
    throw new PdfImportError((error as Error)?.name === 'PasswordException'
      ? 'Este PDF é protegido por senha.'
      : 'Não foi possível ler este PDF. O arquivo pode estar corrompido.');
  }
  try {
    const pages: PdfTextItem[][] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const { items } = await page.getTextContent();
      pages.push(items.filter(item => 'str' in item));
      page.cleanup();
    }
    return pdfItemsToText(pages);
  } finally {
    await task.destroy();
  }
}
