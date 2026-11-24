import { chunkDelayMs, countWords, formatDuration, formatReadingTime, splitAtPivot, tokenize } from './reading';
import {
  addReadingStats, addToLibrary, clearStats, loadLibrary, loadPrefs, loadStats, removeFromLibrary, savePrefs, updateProgress,
} from './preferences';

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

  it('formatDuration', () => {
    expect(formatDuration(59_999)).toBe('menos de 1 min');
    expect(formatDuration(42 * 60_000)).toBe('42 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 05 min');
  });
});

describe('preferences', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns defaults when nothing is stored', () => {
    expect(loadPrefs()).toEqual({
      fontSize: 20, highlightWords: 1, wpm: 250, theme: 'auto',
      mode: 'highlight', focusMode: false, fontFamily: 'sans', lineHeight: 1.75, textWidth: 'medium', highlightColor: 'amber',
    });
  });

  it('merges saved values and clamps tampered ones', () => {
    savePrefs({ wpm: 400, theme: 'dark', mode: 'rsvp', lineHeight: 2 });
    expect(loadPrefs()).toEqual(jasmine.objectContaining({ fontSize: 20, wpm: 400, theme: 'dark', mode: 'rsvp', lineHeight: 2 }));

    localStorage.setItem('readster:prefs', JSON.stringify({
      fontSize: 999, highlightWords: -3, wpm: 'x', theme: 'neon',
      mode: 'x', focusMode: 'yes', fontFamily: 'comic', lineHeight: 9, textWidth: 'huge', highlightColor: 'neon',
    }));
    expect(loadPrefs()).toEqual({
      fontSize: 32, highlightWords: 1, wpm: 250, theme: 'auto',
      mode: 'highlight', focusMode: false, fontFamily: 'sans', lineHeight: 1.75, textWidth: 'medium', highlightColor: 'amber',
    });
  });

  it('survives corrupted JSON', () => {
    localStorage.setItem('readster:prefs', '{nope');
    expect(loadPrefs().wpm).toBe(250);
  });
});

describe('library', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('adds texts with title and word count, most recent first', () => {
    expect(loadLibrary()).toEqual([]);
    const first = addToLibrary('Primeiro título\ncorpo do texto')!;
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(Date.now() + 1000));
    const second = addToLibrary('  Segundo   texto  ')!;
    jasmine.clock().uninstall();

    expect(first.title).toBe('Primeiro título');
    expect(first.words).toBe(5);
    expect(second.title).toBe('Segundo texto');
    expect(loadLibrary().map(item => item.id)).toEqual([second.id, first.id]);
  });

  it('truncates long titles', () => {
    expect(addToLibrary('a'.repeat(80))!.title).toBe('a'.repeat(59) + '…');
  });

  it('reuses an identical text instead of duplicating it, keeping its position', () => {
    const item = addToLibrary('um dois três')!;
    updateProgress(item.id, 2);
    const again = addToLibrary('um dois três')!;
    expect(again.id).toBe(item.id);
    expect(again.index).toBe(2);
    expect(loadLibrary().length).toBe(1);
  });

  it('updates progress and removes items', () => {
    const item = addToLibrary('um dois')!;
    updateProgress(item.id, 1);
    expect(loadLibrary()[0].index).toBe(1);
    removeFromLibrary(item.id);
    expect(loadLibrary()).toEqual([]);
  });

  it('returns null when storage is full', () => {
    spyOn(Storage.prototype, 'setItem').and.throwError(new DOMException('full', 'QuotaExceededError'));
    expect(addToLibrary('um dois')).toBeNull();
  });

  it('drops invalid entries and survives corrupted data', () => {
    localStorage.setItem('readster:library', JSON.stringify([{ id: 'x', text: '', index: 0, updatedAt: 1 }, 'junk']));
    expect(loadLibrary()).toEqual([]);
    localStorage.setItem('readster:library', '{nope');
    expect(loadLibrary()).toEqual([]);
  });

  it('migrates the single saved reading from before the library', () => {
    localStorage.setItem('readster:session', JSON.stringify({ text: 'texto antigo aqui', index: 1 }));
    const [item] = loadLibrary();
    expect(item).toEqual(jasmine.objectContaining({ text: 'texto antigo aqui', index: 1, words: 3 }));
    expect(localStorage.getItem('readster:session')).toBeNull();
    expect(loadLibrary().length).toBe(1);
  });

});

describe('reading stats', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('accumulates, clears and ignores tampered values', () => {
    expect(loadStats()).toEqual({ words: 0, ms: 0 });
    addReadingStats(3, 1000);
    addReadingStats(2, 500);
    expect(loadStats()).toEqual({ words: 5, ms: 1500 });
    clearStats();
    expect(loadStats()).toEqual({ words: 0, ms: 0 });
    localStorage.setItem('readster:stats', JSON.stringify({ words: -1, ms: 'x' }));
    expect(loadStats()).toEqual({ words: 0, ms: 0 });
  });
});
