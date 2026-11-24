import { countWords } from './reading';

export type Theme = 'auto' | 'light' | 'dark';
/** highlight: full text with highlighted words; rsvp: one chunk at a time in a fixed spot. */
export type ReadingMode = 'highlight' | 'rsvp';
export type FontFamily = 'sans' | 'serif';
export type TextWidth = 'narrow' | 'medium' | 'wide';

export const OPTIONS = {
  theme: ['auto', 'light', 'dark'],
  mode: ['highlight', 'rsvp'],
  fontFamily: ['sans', 'serif'],
  lineHeight: [1.5, 1.75, 2],
  textWidth: ['narrow', 'medium', 'wide'],
} as const;

export const LIMITS = {
  fontSize: { min: 12, max: 32, default: 20, step: 4 },
  highlightWords: { min: 1, max: 10, default: 1 },
  wpm: { min: 100, max: 700, default: 250, step: 25 },
} as const;

export interface Prefs {
  fontSize: number;
  highlightWords: number;
  wpm: number;
  theme: Theme;
  mode: ReadingMode;
  focusMode: boolean;
  fontFamily: FontFamily;
  lineHeight: number;
  textWidth: TextWidth;
}

/** A text saved in the local library, with the reading position. */
export interface LibraryItem {
  id: string;
  title: string;
  text: string;
  /** Word index to resume from; equal to `words` when finished. */
  index: number;
  words: number;
  updatedAt: number;
}

const PREFS_KEY = 'readster:prefs';
const LIBRARY_KEY = 'readster:library';
/** Single saved reading from before the library existed; migrated on first load. */
const LEGACY_SESSION_KEY = 'readster:session';

// localStorage is missing on the server and may throw (private mode, blocked storage).
function read(key: string): unknown {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Returns false when storage is unavailable or full; reading keeps working without it. */
function write(key: string, value: unknown): boolean {
  try {
    if (!globalThis.localStorage) return false;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function clampInt(value: unknown, limits: { min: number; max: number; default: number }): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(limits.max, Math.max(limits.min, Math.round(value)))
    : limits.default;
}

/** Returns `value` if it is one of `options`, otherwise `fallback` (the first option by default). */
function oneOf<T>(value: unknown, options: readonly T[], fallback: T = options[0]): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/** Loads preferences, falling back to defaults for anything missing or tampered with. */
export function loadPrefs(): Prefs {
  const raw = (read(PREFS_KEY) ?? {}) as Record<string, unknown>;
  return {
    fontSize: clampInt(raw['fontSize'], LIMITS.fontSize),
    highlightWords: clampInt(raw['highlightWords'], LIMITS.highlightWords),
    wpm: clampInt(raw['wpm'], LIMITS.wpm),
    theme: oneOf(raw['theme'], OPTIONS.theme),
    mode: oneOf(raw['mode'], OPTIONS.mode),
    focusMode: raw['focusMode'] === true,
    fontFamily: oneOf(raw['fontFamily'], OPTIONS.fontFamily),
    lineHeight: oneOf(raw['lineHeight'], OPTIONS.lineHeight, 1.75),
    textWidth: oneOf(raw['textWidth'], OPTIONS.textWidth, 'medium'),
  };
}

export function savePrefs(patch: Partial<Prefs>): void {
  write(PREFS_KEY, { ...loadPrefs(), ...patch });
}

function titleFor(text: string): string {
  const firstLine = text.trim().split('\n')[0].trim().replace(/\s+/g, ' ');
  return firstLine.length > 60 ? firstLine.slice(0, 59) + '…' : firstLine;
}

function isItem(value: unknown): value is LibraryItem {
  const item = value as LibraryItem;
  return typeof item?.id === 'string' && typeof item.text === 'string' && item.text.trim() !== ''
    && typeof item.index === 'number' && typeof item.updatedAt === 'number';
}

/** Saved texts, most recent first. Invalid entries are dropped. */
export function loadLibrary(): LibraryItem[] {
  const raw = read(LIBRARY_KEY);
  if (raw === null) {
    return migrateLegacySession();
  }
  return (Array.isArray(raw) ? raw.filter(isItem) : [])
    .map(item => ({ ...item, title: titleFor(item.text), words: countWords(item.text), index: Math.max(0, Math.floor(item.index)) }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function migrateLegacySession(): LibraryItem[] {
  const legacy = read(LEGACY_SESSION_KEY) as { text?: unknown; index?: unknown } | null;
  if (typeof legacy?.text !== 'string' || !legacy.text.trim()) return [];
  const item = newItem(legacy.text, typeof legacy.index === 'number' ? Math.max(0, Math.floor(legacy.index)) : 0);
  if (write(LIBRARY_KEY, [item])) write(LEGACY_SESSION_KEY, null);
  return [item];
}

function newItem(text: string, index = 0): LibraryItem {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title: titleFor(text),
    text,
    index,
    words: countWords(text),
    updatedAt: Date.now(),
  };
}

/**
 * Adds a text to the library (or moves an identical saved text to the top, keeping its position).
 * Returns null when it could not be saved, e.g. storage is full.
 */
export function addToLibrary(text: string): LibraryItem | null {
  const library = loadLibrary();
  const existing = library.find(item => item.text === text);
  const item = existing ? { ...existing, updatedAt: Date.now() } : newItem(text);
  const saved = write(LIBRARY_KEY, [item, ...library.filter(other => other.id !== item.id)]);
  return saved ? item : null;
}

export function updateProgress(id: string, index: number): void {
  const library = loadLibrary();
  const item = library.find(other => other.id === id);
  if (item) {
    item.index = index;
    item.updatedAt = Date.now();
    write(LIBRARY_KEY, library);
  }
}

export function removeFromLibrary(id: string): void {
  write(LIBRARY_KEY, loadLibrary().filter(item => item.id !== id));
}
