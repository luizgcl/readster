export interface Paragraph {
  /** Index of the paragraph's first word in the flat word list. */
  start: number;
  words: string[];
}

export interface Tokens {
  words: string[];
  paragraphs: Paragraph[];
}

/** Splits text into words, keeping line breaks as paragraph boundaries. */
export function tokenize(text: string): Tokens {
  const words: string[] = [];
  const paragraphs: Paragraph[] = [];
  for (const line of text.split(/\n+/)) {
    const lineWords = line.split(/\s+/).filter(Boolean);
    if (lineWords.length) {
      paragraphs.push({ start: words.length, words: lineWords });
      words.push(...lineWords);
    }
  }
  return { words, paragraphs };
}

export function countWords(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

const SENTENCE_END = /[.!?…]["'”’)\]]*$/;
const CLAUSE_END = /[,;:—–]["'”’)\]]*$/;

/** Time a chunk of words stays highlighted, with longer pauses after punctuation. */
export function chunkDelayMs(chunk: string[], wpm: number): number {
  const base = (chunk.length * 60_000) / wpm;
  const last = chunk[chunk.length - 1] ?? '';
  if (SENTENCE_END.test(last)) return base * 2;
  if (CLAUSE_END.test(last)) return base * 1.5;
  return base;
}

/**
 * Splits text around its optimal recognition point: the letter the eye should land on,
 * slightly left of center. Keeping that letter in a fixed spot avoids eye movement between words.
 */
export function splitAtPivot(text: string): { before: string; pivot: string; after: string } {
  const length = text.length;
  const pivot = length <= 1 ? 0 : length <= 5 ? 1 : length <= 9 ? 2 : length <= 13 ? 3 : 4;
  return { before: text.slice(0, pivot), pivot: text.charAt(pivot), after: text.slice(pivot + 1) };
}

/** Human estimate of reading time, e.g. "~3 min" or "menos de 1 min". */
export function formatReadingTime(words: number, wpm: number): string {
  const minutes = words / wpm;
  return minutes < 1 ? 'menos de 1 min' : `~${Math.round(minutes)} min`;
}
