/** Mini générateur PDF A4, sans dépendance (Helvetica WinAnsi). */

export type PdfColor = [number, number, number];
export type PdfFont = 'F1' | 'F2';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const n = (value: number): string => (Math.round(value * 100) / 100).toString();

const latin1 = (value: string): Uint8Array => {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i) & 0xff;
  }
  return bytes;
};

export const pdfSafe = (value: string): string =>
  Array.from(String(value ?? '').normalize('NFC'))
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 9 || code === 10 || code === 13) return ' ';
      if (code >= 32 && code <= 126) return ch;
      if (code >= 160 && code <= 255) return ch;
      const mapped: Record<string, string> = {
        '\u2018': "'",
        '\u2019': "'",
        '\u201C': '"',
        '\u201D': '"',
        '\u2013': '-',
        '\u2014': '-',
        '\u2026': '...',
        '\u202F': ' ',
        '\u00A0': ' ',
        '\u2007': ' ',
        '\u2009': ' ',
        '\u2212': '-',
        '\u00D7': 'x',
        '\u2022': '-',
        '\u20AC': 'EUR',
      };
      return mapped[ch] ?? '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

const pdfLiteral = (value: string): string => {
  const safe = pdfSafe(value);
  let out = '(';
  for (let i = 0; i < safe.length; i += 1) {
    const code = safe.charCodeAt(i);
    if (code === 0x5c) out += '\\\\';
    else if (code === 0x28) out += '\\(';
    else if (code === 0x29) out += '\\)';
    else if (code < 32 || code > 126) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += safe[i];
  }
  return `${out})`;
};

/** Largeur approximative Helvetica, en points. */
export const textWidth = (value: string, size: number, bold = false): number =>
  pdfSafe(value).length * size * (bold ? 0.58 : 0.5);

export const wrapText = (
  value: string,
  size: number,
  maxWidth: number,
  bold = false,
): string[] => {
  const safe = pdfSafe(value);
  if (!safe) return [];
  const words = safe.split(' ');
  const lines: string[] = [];
  let current = '';
  const fits = (text: string) => textWidth(text, size, bold) <= maxWidth;

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (fits(next)) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (fits(word)) {
      current = word;
      continue;
    }
    let chunk = '';
    for (const letter of word) {
      const trial = chunk + letter;
      if (fits(trial)) chunk = trial;
      else {
        if (chunk) lines.push(chunk);
        chunk = letter;
      }
    }
    current = chunk;
  }
  if (current) lines.push(current);
  return lines;
};

export class SimplePdf {
  readonly width = PAGE_WIDTH;
  readonly height = PAGE_HEIGHT;
  private readonly pages: string[][] = [[]];
  private current = 0;
  private title = 'Document';
  private author = '';

  setInfo(title: string, author: string) {
    this.title = pdfSafe(title);
    this.author = pdfSafe(author);
  }

  addPage() {
    this.pages.push([]);
    this.current = this.pages.length - 1;
  }

  private op(command: string) {
    this.pages[this.current].push(command);
  }

  fillRect(x: number, y: number, w: number, h: number, color: PdfColor) {
    this.op(`${color[0]} ${color[1]} ${color[2]} rg`);
    this.op(`${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
  }

  strokeRect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: PdfColor,
    width = 0.8,
    dash?: number[],
  ) {
    this.op(`${color[0]} ${color[1]} ${color[2]} RG`);
    this.op(`${n(width)} w`);
    if (dash?.length) this.op(`[${dash.join(' ')}] 0 d`);
    this.op(`${n(x)} ${n(y)} ${n(w)} ${n(h)} re S`);
    if (dash?.length) this.op('[] 0 d');
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: PdfColor,
    width = 0.6,
    dash?: number[],
  ) {
    this.op(`${color[0]} ${color[1]} ${color[2]} RG`);
    this.op(`${n(width)} w`);
    if (dash?.length) this.op(`[${dash.join(' ')}] 0 d`);
    this.op(`${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`);
    if (dash?.length) this.op('[] 0 d');
  }

  text(
    x: number,
    y: number,
    size: number,
    font: PdfFont,
    value: string,
    color: PdfColor,
  ) {
    const literal = pdfLiteral(value);
    if (literal === '()') return;
    this.op(`${color[0]} ${color[1]} ${color[2]} rg`);
    this.op(
      `BT /${font} ${n(size)} Tf 1 0 0 1 ${n(x)} ${n(y)} Tm ${literal} Tj ET`,
    );
  }

  textRight(
    right: number,
    y: number,
    size: number,
    font: PdfFont,
    value: string,
    color: PdfColor,
  ) {
    const safe = pdfSafe(value);
    this.text(right - textWidth(safe, size, font === 'F2'), y, size, font, safe, color);
  }

  textCenter(
    center: number,
    y: number,
    size: number,
    font: PdfFont,
    value: string,
    color: PdfColor,
  ) {
    const safe = pdfSafe(value);
    this.text(center - textWidth(safe, size, font === 'F2') / 2, y, size, font, safe, color);
  }

  save(): Uint8Array {
    const objects: string[] = [];
    const add = (body: string): number => {
      objects.push(body);
      return objects.length;
    };

    const fontRegular = add(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    );
    const fontBold = add(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    );

    const pageIds: number[] = [];
    for (const ops of this.pages) {
      const stream = `${ops.join('\n')}\n`;
      const contents = add(
        `<< /Length ${latin1(stream).length} >>\nstream\n${stream}endstream`,
      );
      const page = add(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${n(this.width)} ${n(this.height)}] ` +
          `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> /ProcSet [/PDF /Text] >> ` +
          `/Contents ${contents} 0 R >>`,
      );
      pageIds.push(page);
    }

    const pages = add(
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
    );
    const catalog = add(`<< /Type /Catalog /Pages ${pages} 0 R >>`);
    const info = add(
      `<< /Title ${pdfLiteral(this.title)} /Author ${pdfLiteral(this.author)} /Creator ${pdfLiteral(this.author)} >>`,
    );

    for (const id of pageIds) {
      objects[id - 1] = objects[id - 1].replace('/Parent 0 0 R', `/Parent ${pages} 0 R`);
    }

    const parts: string[] = ['%PDF-1.4\n'];
    const offsets = [0];
    let cursor = parts[0].length;

    objects.forEach((body, index) => {
      const block = `${index + 1} 0 obj\n${body}\nendobj\n`;
      offsets.push(cursor);
      parts.push(block);
      cursor += block.length;
    });

    const xrefStart = cursor;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i += 1) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    const trailer =
      `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\n` +
      `startxref\n${xrefStart}\n%%EOF\n`;
    parts.push(xref, trailer);

    return latin1(parts.join(''));
  }
}
