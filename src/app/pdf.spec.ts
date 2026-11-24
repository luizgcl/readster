import { extractPdfText, PdfImportError, PdfTextItem, pdfItemsToText } from './pdf';

/** Builds a small valid PDF with one page per entry; each page lists [text, y] lines in Helvetica 12. */
export function makePdf(pages: [string, number][][]): File {
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '', // pages tree, filled below
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const kids: string[] = [];
  for (const lines of pages) {
    const stream = lines.map(([text, y]) => `BT /F1 12 Tf 72 ${y} Td (${text}) Tj ET`).join('\n');
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const contents = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contents} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
    kids.push(`${objects.length} 0 R`);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;

  let body = '%PDF-1.4\n';
  const offsets = objects.map((object, i) => {
    const offset = body.length;
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    + offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
    + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new File([body], 'doc.pdf', { type: 'application/pdf' });
}

const item = (str: string, y: number, hasEOL = true): PdfTextItem => ({ str, hasEOL, transform: [12, 0, 0, 12, 72, y], height: 12 });

describe('pdfItemsToText', () => {
  it('joins wrapped lines and splits paragraphs on gaps, blank lines, columns and pages', () => {
    expect(pdfItemsToText([
      [item('Primeira linha', 700), item('continua aqui.', 686), item('Novo parágrafo', 650)],
      [item('Outra ', 700, false), item('página', 700), item('', 686), item('após linha vazia', 672), item('coluna', 750)],
    ])).toBe('Primeira linha continua aqui.\nNovo parágrafo\nOutra página\napós linha vazia\ncoluna');
  });

  it('rejoins words hyphenated at the end of a line', () => {
    expect(pdfItemsToText([[item('uma pala-', 700), item('vra', 686)]])).toBe('uma palavra');
  });

  it('returns nothing for pages without text', () => {
    expect(pdfItemsToText([[], [item('  ', 700)]])).toBe('');
  });
});

describe('extractPdfText', () => {
  it('reads the text of every page with pdf.js', async () => {
    const text = await extractPdfText(makePdf([
      [['Ola mundo,', 700], ['segunda linha.', 686]],
      [['Pagina dois', 700]],
    ]));
    expect(text).toBe('Ola mundo, segunda linha.\nPagina dois');
  });

  it('rejects files that are not PDFs', async () => {
    await expectAsync(extractPdfText(new File(['not a pdf'], 'x.pdf'))).toBeRejectedWithError(PdfImportError);
  });
});
