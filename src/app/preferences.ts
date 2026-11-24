export type Theme = 'auto' | 'light' | 'dark';

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
}

export interface Session {
  text: string;
  index: number;
}

const PREFS_KEY = 'readster:prefs';
const SESSION_KEY = 'readster:session';
const THEMES: readonly Theme[] = ['auto', 'light', 'dark'];

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

/** Loads preferences, falling back to defaults for anything missing or tampered with. */
export function loadPrefs(): Prefs {
  const raw = (read(PREFS_KEY) ?? {}) as Record<string, unknown>;
  return {
    fontSize: clampInt(raw['fontSize'], LIMITS.fontSize),
    highlightWords: clampInt(raw['highlightWords'], LIMITS.highlightWords),
    wpm: clampInt(raw['wpm'], LIMITS.wpm),
    theme: THEMES.includes(raw['theme'] as Theme) ? (raw['theme'] as Theme) : 'auto',
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
