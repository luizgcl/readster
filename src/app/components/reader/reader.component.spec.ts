import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ReaderComponent } from './reader.component';
import { appConfig } from '../../app.config';
import { addToLibrary, loadLibrary, loadPrefs, loadStats, savePrefs } from '../../preferences';

describe('ReaderComponent', () => {
  let component: ReaderComponent;
  let fixture: ComponentFixture<ReaderComponent>;
  let el: HTMLElement;

  function create(text: string, startIndex = 0) {
    fixture = TestBed.createComponent(ReaderComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.componentRef.setInput('text', text);
    fixture.componentRef.setInput('startIndex', startIndex);
    fixture.componentRef.setInput('itemId', addToLibrary(text)!.id);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ReaderComponent],
      providers: appConfig.providers,
    }).compileComponents();
    create('  um  dois\ntrês   quatro cinco ');
  });

  afterEach(() => localStorage.clear());

  /** Saved position of the text currently open in the reader. */
  const savedIndex = () => loadLibrary().find(item => item.text === component.text())?.index;

  const highlighted = () => Array.from(el.querySelectorAll('.highlight')).map(e => e.textContent);
  const button = (label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const key = (k: string, target: EventTarget = document.body) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

  describe('rendering and navigation', () => {
    it('renders paragraphs and highlights exactly one word by default', () => {
      expect(el.querySelectorAll('p.mb-4').length).toBe(2);
      expect(highlighted()).toEqual(['um']);
    });

    it('moves forward and backward by the same amount', () => {
      component.onHighlightWordsChange(2);
      fixture.detectChanges();
      expect(highlighted()).toEqual(['um', 'dois']);

      button('Próximas palavras').click();
      fixture.detectChanges();
      expect(highlighted()).toEqual(['três', 'quatro']);

      button('Palavras anteriores').click();
      fixture.detectChanges();
      expect(highlighted()).toEqual(['um', 'dois']);
    });

    it('clamps at start, stops at the end and restarts', () => {
      expect(button('Palavras anteriores').disabled).toBeTrue();
      for (let i = 0; i < 10; i++) component.highlightNextWord();
      fixture.detectChanges();
      expect(highlighted()).toEqual(['cinco']);
      expect(button('Próximas palavras').disabled).toBeTrue();

      button('Voltar ao início').click();
      fixture.detectChanges();
      expect(highlighted()).toEqual(['um']);
    });

    it('shows progress and remaining time', () => {
      component.highlightNextWord();
      fixture.detectChanges();
      expect(component.wordsRead).toBe(2);
      expect(component.progressPercent).toBe(40);
      expect(el.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('40');
      expect(el.textContent).toContain('2 de 5 palavras');
    });

    it('scrolls to the new word only when it leaves the middle of the box', async () => {
      create(Array.from({ length: 3000 }, (_, i) => `w${i}`).join(' '));
      fixture.autoDetectChanges();
      const spy = spyOn(HTMLElement.prototype, 'scrollIntoView');

      button('Próximas palavras').click(); // w1 is still near the top: no scroll
      await fixture.whenStable();
      expect(spy).not.toHaveBeenCalled();

      for (let i = 0; i < 500; i++) component.highlightNextWord();
      await fixture.whenStable();
      expect(spy).toHaveBeenCalled();
      expect((spy.calls.mostRecent().object as HTMLElement).textContent).toBe('w501');
    });
  });

  describe('auto play', () => {
    // 60 wpm = 1000 ms per word, doubled after sentence endings.
    beforeEach(() => {
      create('um dois. três quatro');
      component.onWpmChange(60);
    });

    it('advances on its own and pauses/resumes keeping the position', fakeAsync(() => {
      component.play();
      tick(1000);
      expect(component.highlightedIndex).toBe(1);

      component.pause();
      tick(5000);
      expect(component.highlightedIndex).toBe(1);

      component.play();
      tick(1999); // "dois." gets the sentence pause
      expect(component.highlightedIndex).toBe(1);
      tick(1);
      expect(component.highlightedIndex).toBe(2);
      component.pause();
    }));

    it('applies a speed change on the next step without restarting', fakeAsync(() => {
      component.play();
      tick(1000);
      expect(component.highlightedIndex).toBe(1);
      component.onWpmChange(120); // takes effect after the current step
      tick(2000);
      expect(component.highlightedIndex).toBe(2);
      tick(500);
      expect(component.highlightedIndex).toBe(3);
      component.pause();
    }));

    it('stops at the end, marks completion and saves 100% progress', fakeAsync(() => {
      component.play();
      tick(1000 + 2000 + 1000 + 1000);
      expect(component.playing).toBeFalse();
      expect(component.completed).toBeTrue();
      expect(component.highlightedIndex).toBe(3);
      expect(savedIndex()).toBe(4); // = word count
      fixture.detectChanges();
      expect(el.textContent).toContain('Leitura concluída');

      component.play(); // playing again from the end starts over
      expect(component.highlightedIndex).toBe(0);
      component.pause();
    }));

    it('records timed reading, leaving out paused and idle time', fakeAsync(() => {
      component.play();
      tick(1000 + 2000); // "um", "dois."
      component.pause();
      expect(loadStats()).toEqual({ words: 2, ms: 3000 });

      tick(60_000); // paused: nothing counts, even when stepping by hand right after
      component.highlightNextWord();
      expect(loadStats().words).toBe(2);

      tick(800);
      component.highlightNextWord(); // already at the last word: no step, nothing counted
      expect(loadStats().words).toBe(2);
      component.highlightPreviousWord();
      tick(31_000); // reader away for too long
      component.highlightNextWord();
      expect(loadStats()).toEqual({ words: 2, ms: 3000 });

      component.highlightPreviousWord();
      component.play();
      tick(1000 + 1000); // "três", then "quatro" finishes the text: both counted
      expect(component.completed).toBeTrue();
      expect(loadStats()).toEqual({ words: 4, ms: 5000 });
    }));

    it('clears the timer when destroyed', fakeAsync(() => {
      component.play();
      fixture.destroy();
      tick(10000);
      expect(component.highlightedIndex).toBe(0);
    }));
  });

  describe('keyboard', () => {
    it('handles space, arrows and font keys', fakeAsync(() => {
      key('ArrowRight');
      expect(component.highlightedIndex).toBe(1);
      key('ArrowLeft');
      expect(component.highlightedIndex).toBe(0);
      key('+');
      expect(component.fontSize).toBe(24);
      key('-');
      expect(component.fontSize).toBe(20);
      key(' ');
      expect(component.playing).toBeTrue();
      key(' ');
      expect(component.playing).toBeFalse();
    }));

    it('ignores shortcuts typed into form fields', () => {
      key('ArrowRight', el.querySelector('#wpm')!);
      expect(component.highlightedIndex).toBe(0);
    });
  });

  describe('persistence', () => {
    it('saves preferences and restores them in a new reader', () => {
      component.increaseFontSize();
      component.onWpmChange(400);
      component.onHighlightWordsChange(3);
      expect(loadPrefs()).toEqual(jasmine.objectContaining({ fontSize: 24, wpm: 400, highlightWords: 3 }));

      create('a b c');
      expect(component.fontSize).toBe(24);
      expect(component.wpm).toBe(400);
      expect(component.highlightWords).toBe(3);
    });

    it('saves progress on every move and resumes from startIndex', () => {
      component.highlightNextWord();
      expect(savedIndex()).toBe(1);

      savePrefs({ highlightWords: 1 });
      create('um dois três', 2);
      fixture.detectChanges();
      expect(highlighted()).toEqual(['três']);
    });
  });

  it('reads without saving when there is no library item', () => {
    fixture.componentRef.setInput('itemId', null);
    localStorage.clear();
    component.highlightNextWord();
    expect(loadLibrary()).toEqual([]);
  });

  describe('P2 modes and typography', () => {
    it('jumps to a clicked word', () => {
      (el.querySelector('[data-i="3"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(highlighted()).toEqual(['quatro']);
      expect(savedIndex()).toBe(3);
    });

    it('focus mode hides settings only while playing, toggled with F', fakeAsync(() => {
      const settings = () => el.querySelector('details');
      key('f');
      fixture.detectChanges();
      expect(component.focusMode).toBeTrue();
      expect(settings()).withContext('paused: settings visible').toBeTruthy();

      component.play();
      fixture.detectChanges();
      expect(settings()).withContext('playing: hidden').toBeNull();
      expect(button('Pausar leitura automática')).withContext('playback stays reachable').toBeTruthy();

      component.pause();
      fixture.detectChanges();
      expect(settings()).toBeTruthy();
      expect(loadPrefs().focusMode).toBeTrue();
    }));

    it('RSVP shows the current chunk split at the pivot and keeps the position', () => {
      component.highlightNextWord();
      component.setPref('mode', 'rsvp');
      fixture.detectChanges();
      const rsvp = el.querySelector('.rsvp')!;
      expect(rsvp.getAttribute('aria-label')).toBe('dois');
      expect(Array.from(rsvp.children).map(c => c.textContent)).toEqual(['d', 'o', 'is']);
      expect(el.querySelector('.highlight')).toBeNull();

      component.onHighlightWordsChange(2);
      fixture.detectChanges();
      expect(rsvp.getAttribute('aria-label')).toBe('dois três');

      component.setPref('mode', 'highlight');
      fixture.detectChanges();
      expect(highlighted()).toEqual(['dois', 'três']);
      expect(loadPrefs().mode).toBe('highlight');
    });

    it('RSVP font scales with the box and uses the font size setting as a multiplier', () => {
      component.setPref('mode', 'rsvp');
      expect(component.rsvpFontSize).toBe('min(clamp(32.0px, 10.00cqw, 30.00cqh), calc(50cqw / 0.93))'); // "um": side of 1 char + half pivot
      component.increaseFontSize(); // 24 / 20 = 1.2x
      expect(component.rsvpFontSize).toContain('clamp(38.4px, 12.00cqw, 36.00cqh)');
      // the reader must span the available width, or the box (and the font) cannot grow
      expect(getComputedStyle(el).display).toBe('flex');
      expect(el.classList).toContain('w-full');
    });

    it('applies font family, line height and text width', () => {
      component.setPref('fontFamily', 'serif');
      component.setPref('lineHeight', 2);
      component.setPref('textWidth', 'narrow');
      fixture.detectChanges();
      const textBox = el.querySelector<HTMLElement>('[data-i="0"]')!.closest('div')!;
      expect(el.querySelector('.card')!.classList).toContain('font-serif');
      expect(textBox.style.lineHeight).toBe('2');
      expect(textBox.classList).toContain('max-w-[55ch]');
      expect(textBox.classList).toContain('mx-auto');
      expect(loadPrefs()).toEqual(jasmine.objectContaining({ fontFamily: 'serif', lineHeight: 2, textWidth: 'narrow' }));
    });
  });

  it('changes font size from the buttons within limits', () => {
    button('Aumentar fonte').click();
    expect(component.fontSize).toBe(24);

    for (let i = 0; i < 10; i++) component.increaseFontSize();
    fixture.detectChanges();
    expect(component.fontSize).toBe(32);
    expect(button('Aumentar fonte').disabled).toBeTrue();

    button('Restaurar tamanho da fonte').click();
    expect(component.fontSize).toBe(20);

    for (let i = 0; i < 10; i++) component.decreaseFontSize();
    fixture.detectChanges();
    expect(component.fontSize).toBe(12);
    expect(button('Diminuir fonte').disabled).toBeTrue();
  });
});
