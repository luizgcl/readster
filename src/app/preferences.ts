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

export interface Session {
  text: string;
  index: number;
}

const PREFS_KEY = 'readster:prefs';
const SESSION_KEY = 'readster:session';

// localStorage is missing on the server and may throw (private mode, blocked storage).
function read(key: string): unknown {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is a convenience; reading keeps working without it.
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

export function loadSession(): Session | null {
  const raw = read(SESSION_KEY) as Partial<Session> | null;
  if (typeof raw?.text !== 'string' || !raw.text.trim()) return null;
  const index = typeof raw.index === 'number' && raw.index >= 0 ? Math.floor(raw.index) : 0;
  return { text: raw.text, index };
}

export function saveSession(session: Session | null): void {
  write(SESSION_KEY, session);
}
