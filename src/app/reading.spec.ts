import { chunkDelayMs, countWords, formatReadingTime, splitAtPivot, tokenize } from './reading';
import { loadPrefs, loadSession, savePrefs, saveSession } from './preferences';

describe('reading', () => {
  it('tokenize keeps paragraphs and ignores empty words', () => {
    const { words, paragraphs } = tokenize('  um  dois\n\n\ttrês\nquatro   cinco ');
    expect(words).toEqual(['um', 'dois', 'três', 'quatro', 'cinco']);
    expect(paragraphs).toEqual([
      { start: 0, words: ['um', 'dois'] },
      { start: 2, words: ['três'] },
      { start: 3, words: ['quatro', 'cinco'] },
    ]);
  });

  it('countWords counts non-whitespace runs', () => {
    expect(countWords('')).toBe(0);
    expect(countWords(' a  b\nc ')).toBe(3);
  });

  it('chunkDelayMs scales with chunk size and pauses on punctuation', () => {
    expect(chunkDelayMs(['palavra'], 60)).toBe(1000);
    expect(chunkDelayMs(['duas', 'palavras'], 120)).toBe(1000);
    expect(chunkDelayMs(['vírgula,'], 60)).toBe(1500);
    expect(chunkDelayMs(['fim.'], 60)).toBe(2000);
    expect(chunkDelayMs(['citação."'], 60)).toBe(2000);
  });

  it('splitAtPivot puts the recognition letter slightly left of center', () => {
    expect(splitAtPivot('a')).toEqual({ before: '', pivot: 'a', after: '' });
    expect(splitAtPivot('casa')).toEqual({ before: 'c', pivot: 'a', after: 'sa' });
    expect(splitAtPivot('palavras')).toEqual({ before: 'pa', pivot: 'l', after: 'avras' });
    expect(splitAtPivot('extraordinariamente')).toEqual({ before: 'extr', pivot: 'a', after: 'ordinariamente' });
    expect(splitAtPivot('')).toEqual({ before: '', pivot: '', after: '' });
  });

  it('formatReadingTime', () => {
    expect(formatReadingTime(100, 250)).toBe('menos de 1 min');
    expect(formatReadingTime(750, 250)).toBe('~3 min');
  });
});

describe('preferences', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns defaults when nothing is stored', () => {
    expect(loadPrefs()).toEqual({
      fontSize: 20, highlightWords: 1, wpm: 250, theme: 'auto',
      mode: 'highlight', focusMode: false, fontFamily: 'sans', lineHeight: 1.75, textWidth: 'medium',
    });
  });

  it('merges saved values and clamps tampered ones', () => {
    savePrefs({ wpm: 400, theme: 'dark', mode: 'rsvp', lineHeight: 2 });
    expect(loadPrefs()).toEqual(jasmine.objectContaining({ fontSize: 20, wpm: 400, theme: 'dark', mode: 'rsvp', lineHeight: 2 }));

    localStorage.setItem('readster:prefs', JSON.stringify({
      fontSize: 999, highlightWords: -3, wpm: 'x', theme: 'neon',
      mode: 'x', focusMode: 'yes', fontFamily: 'comic', lineHeight: 9, textWidth: 'huge',
    }));
    expect(loadPrefs()).toEqual({
      fontSize: 32, highlightWords: 1, wpm: 250, theme: 'auto',
      mode: 'highlight', focusMode: false, fontFamily: 'sans', lineHeight: 1.75, textWidth: 'medium',
    });
  });

  it('survives corrupted JSON', () => {
    localStorage.setItem('readster:prefs', '{nope');
    expect(loadPrefs().wpm).toBe(250);
  });

  it('saves, loads and clears the session', () => {
    expect(loadSession()).toBeNull();
    saveSession({ text: 'um dois', index: 1 });
    expect(loadSession()).toEqual({ text: 'um dois', index: 1 });
    saveSession(null);
    expect(loadSession()).toBeNull();
  });
});
