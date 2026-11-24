import {
  afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, input, OnInit, output, viewChild,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FontSizePipe } from '../../pipes/font-size.pipe';
import { StepperComponent } from '../stepper/stepper.component';
import { SegmentedComponent, SegmentOption } from '../segmented/segmented.component';
import { FormsModule } from '@angular/forms';
import { chunkDelayMs, formatReadingTime, splitAtPivot, tokenize } from '../../reading';
import { addReadingStats, LIMITS, loadPrefs, OPTIONS, Prefs, savePrefs, titleFor, updateProgress } from '../../preferences';

type ReaderPref = 'fontSize' | 'highlightWords' | 'wpm' | 'mode' | 'focusMode' | 'fontFamily' | 'lineHeight' | 'textWidth' | 'highlightColor';

/** A chunk shown longer than this was not being read (reader away), so it is left out of the stats. */
const MAX_CHUNK_MS = 30_000;

const TEXT_WIDTH_CLASS: Record<Prefs['textWidth'], string> = {
  narrow: 'max-w-[55ch]',
  medium: 'max-w-[70ch]',
  wide: 'max-w-none',
};

@Component({
  selector: 'app-reader',
  imports: [LucideAngularModule, FontSizePipe, FormsModule, StepperComponent, SegmentedComponent],
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.scss',
  host: {
    // Full-width block: the RSVP box has no intrinsic width (container query), so an inline host
    // would shrink the card to the controls' width on any screen.
    class: 'flex w-full justify-center',
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class ReaderComponent implements OnInit {
  private injector = inject(Injector);
  // Absent in RSVP mode.
  private textContainer = viewChild<ElementRef<HTMLElement>>('textContainer');
  private settingsDialog = viewChild<ElementRef<HTMLDialogElement>>('settingsDialog');
  private shortcutsDialog = viewChild<ElementRef<HTMLDialogElement>>('shortcutsDialog');

  text = input.required<string>();
  /** Word index to resume from. */
  startIndex = input(0);
  /** Library item that receives progress updates; null when the text could not be saved. */
  itemId = input<string | null>(null);
  quitReading = output();

  readonly title = computed(() => titleFor(this.text()));
  private tokens = computed(() => tokenize(this.text()));
  words = computed(() => this.tokens().words);
  paragraphs = computed(() => this.tokens().paragraphs);

  readonly limits = LIMITS;
  readonly options = OPTIONS;
  readonly modeOptions: SegmentOption<Prefs['mode']>[] = [
    { value: 'highlight', label: 'Texto completo' },
    { value: 'rsvp', label: 'Palavra a palavra' },
  ];
  readonly fontFamilyOptions: SegmentOption<Prefs['fontFamily']>[] = [
    { value: 'sans', label: 'Sem serifa' },
    { value: 'serif', label: 'Com serifa' },
  ];
  readonly lineHeightOptions: SegmentOption<number>[] = [
    { value: 1.5, label: 'Compacta' },
    { value: 1.75, label: 'Normal' },
    { value: 2, label: 'Ampla' },
  ];
  readonly textWidthOptions: SegmentOption<Prefs['textWidth']>[] = [
    { value: 'narrow', label: 'Estreita' },
    { value: 'medium', label: 'Média' },
    { value: 'wide', label: 'Larga' },
  ];
  readonly highlightColorOptions: { value: Prefs['highlightColor']; label: string }[] = [
    { value: 'amber', label: 'Amarelo' },
    { value: 'green', label: 'Verde' },
    { value: 'blue', label: 'Azul' },
    { value: 'pink', label: 'Rosa' },
    { value: 'underline', label: 'Sublinhado' },
  ];

  private prefs = loadPrefs();
  fontSize = this.prefs.fontSize;
  highlightWords = this.prefs.highlightWords;
  wpm = this.prefs.wpm;
  mode = this.prefs.mode;
  focusMode = this.prefs.focusMode;
  fontFamily = this.prefs.fontFamily;
  lineHeight = this.prefs.lineHeight;
  textWidth = this.prefs.textWidth;
  highlightColor = this.prefs.highlightColor;

  highlightedIndex = 0;
  playing = false;
  completed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** When the current chunk appeared; 0 while paused, so paused time is never counted. */
  private shownAt = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  ngOnInit(): void {
    const last = Math.max(0, this.words().length - 1);
    this.goTo(Math.min(this.startIndex(), last));
  }

  isHighlighted(index: number): boolean {
    return index >= this.highlightedIndex && index < this.highlightedIndex + this.highlightWords;
  }

  get isAtStart(): boolean {
    return this.highlightedIndex === 0;
  }

  get isAtEnd(): boolean {
    return this.highlightedIndex + this.highlightWords >= this.words().length;
  }

  /** Words read so far, counting the highlighted chunk. */
  get wordsRead(): number {
    return Math.min(this.words().length, this.highlightedIndex + this.highlightWords);
  }

  get progressPercent(): number {
    const total = this.words().length;
    return total ? Math.round((this.wordsRead / total) * 100) : 0;
  }

  get remainingTime(): string {
    return formatReadingTime(this.words().length - this.wordsRead, this.wpm);
  }

  /** Current chunk split at its recognition point, for RSVP mode. */
  get rsvpParts() {
    const chunk = this.words().slice(this.highlightedIndex, this.highlightedIndex + this.highlightWords);
    return splitAtPivot(chunk.join(' '));
  }

  /**
   * Scales with the RSVP box (width and height), using the font size setting as a multiplier,
   * then shrinks so the longer side of the pivot still fits in half the box.
   * ponytail: assumes ~0.62em per glyph; very wide glyphs (e.g. "WWW") may still clip.
   */
  get rsvpFontSize(): string {
    const scale = this.fontSize / LIMITS.fontSize.default;
    const { before, after } = this.rsvpParts;
    const sideChars = Math.max(before.length, after.length) + 0.5;
    const responsive = `clamp(${(32 * scale).toFixed(1)}px, ${(10 * scale).toFixed(2)}cqw, ${(30 * scale).toFixed(2)}cqh)`;
    return `min(${responsive}, calc(50cqw / ${(sideChars * 0.62).toFixed(2)}))`;
  }

  /** Focus mode hides everything but the text and playback controls while playing. */
  get hideSettings(): boolean {
    return this.focusMode && this.playing;
  }

  get textWidthClass(): string {
    return TEXT_WIDTH_CLASS[this.textWidth];
  }

  /** Jumps to a clicked word (event delegation keeps thousands of words out of the tab order). */
  onTextClick(event: MouseEvent): void {
    const index = (event.target as HTMLElement).closest<HTMLElement>('[data-i]')?.dataset['i'];
    if (index !== undefined) {
      this.goTo(Number(index));
    }
  }

  // --- navigation -------------------------------------------------------

  highlightPreviousWord(): void {
    this.goTo(Math.max(0, this.highlightedIndex - this.highlightWords));
  }

  highlightNextWord(): void {
    if (!this.isAtEnd) {
      this.recordReading();
      this.goTo(this.highlightedIndex + this.highlightWords);
    }
  }

  restart(): void {
    this.goTo(0);
  }

  private goTo(index: number): void {
    this.highlightedIndex = index;
    this.shownAt = Date.now();
    this.completed = false;
    this.saveProgress(index);
    this.scrollToHighlightedWord();
    if (this.playing) {
      this.scheduleNextStep();
    }
  }

  // --- auto play --------------------------------------------------------

  togglePlay(): void {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  play(): void {
    this.playing = true;
    if (this.isAtEnd) {
      this.goTo(0); // also schedules
    } else {
      this.shownAt = Date.now();
      this.scheduleNextStep();
    }
  }

  pause(): void {
    this.playing = false;
    this.shownAt = 0;
    clearTimeout(this.timer);
  }

  // A chained timeout (not an interval) so speed and chunk changes apply on the next step.
  private scheduleNextStep(): void {
    clearTimeout(this.timer);
    const chunk = this.words().slice(this.highlightedIndex, this.highlightedIndex + this.highlightWords);
    this.timer = setTimeout(() => {
      if (this.isAtEnd) {
        this.finish();
      } else {
        this.highlightNextWord();
      }
    }, chunkDelayMs(chunk, this.wpm));
  }

  private finish(): void {
    this.recordReading();
    this.pause();
    this.completed = true;
    this.saveProgress(this.words().length); // 100% in the library
  }

  /** Counts the chunk being left as read, if it was on screen for a plausible time. */
  private recordReading(): void {
    const elapsed = this.shownAt ? Date.now() - this.shownAt : 0;
    if (elapsed > 0 && elapsed <= MAX_CHUNK_MS) {
      addReadingStats(Math.min(this.highlightWords, this.words().length - this.highlightedIndex), elapsed);
    }
  }

  private saveProgress(index: number): void {
    const id = this.itemId();
    if (id) {
      updateProgress(id, index);
    }
  }

  // --- preferences ------------------------------------------------------

  increaseFontSize(): void {
    this.setFontSize(this.fontSize + LIMITS.fontSize.step);
  }

  resetFontSize(): void {
    this.setFontSize(LIMITS.fontSize.default);
  }

  decreaseFontSize(): void {
    this.setFontSize(this.fontSize - LIMITS.fontSize.step);
  }

  setFontSize(size: number): void {
    this.setPref('fontSize', Math.min(LIMITS.fontSize.max, Math.max(LIMITS.fontSize.min, size)));
  }

  onHighlightWordsChange(value: number): void {
    this.setPref('highlightWords', value);
  }

  onWpmChange(value: number): void {
    this.setPref('wpm', value);
  }

  changeWpm(delta: number): void {
    const { min, max } = LIMITS.wpm;
    this.onWpmChange(Math.min(max, Math.max(min, this.wpm + delta)));
  }

  openSettings(): void {
    this.settingsDialog()?.nativeElement.showModal();
  }

  openShortcuts(): void {
    this.shortcutsDialog()?.nativeElement.showModal();
  }

  /** Closes a dialog when the click lands on its backdrop (the dialog element itself). */
  closeOnBackdrop(event: MouseEvent): void {
    const dialog = event.target as HTMLElement;
    if (dialog instanceof HTMLDialogElement) dialog.close();
  }

  /** Updates a reader preference and persists it. */
  setPref<K extends ReaderPref>(key: K, value: Prefs[K]): void {
    (this as Pick<Prefs, ReaderPref>)[key] = value;
    savePrefs({ [key]: value });
    if (key === 'mode' && value === 'highlight') {
      this.scrollToHighlightedWord(); // the text box was just recreated
    }
  }

  // --- keyboard ---------------------------------------------------------

  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    // Leave form fields (range/select use arrows) and modified shortcuts to the browser.
    if (event.ctrlKey || event.metaKey || event.altKey || target?.closest('input, select, textarea')) {
      return;
    }
    switch (event.key) {
      case ' ':
        if (target?.closest('button')) return; // the focused button handles Space itself
        this.togglePlay();
        break;
      case 'ArrowRight':
        this.highlightNextWord();
        break;
      case 'ArrowLeft':
        this.highlightPreviousWord();
        break;
      case '+':
      case '=':
        this.increaseFontSize();
        break;
      case '-':
        this.decreaseFontSize();
        break;
      case 'f':
      case 'F':
        this.setPref('focusMode', !this.focusMode);
        break;
      case 'ArrowUp':
        this.changeWpm(LIMITS.wpm.step);
        break;
      case 'ArrowDown':
        this.changeWpm(-LIMITS.wpm.step);
        break;
      case '?':
        this.openShortcuts();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  // --- scrolling --------------------------------------------------------

  // Runs after the DOM reflects the new index, otherwise we would scroll to the previous word.
  // Only scrolls when the word leaves the middle of the box, to avoid constant motion while playing.
  private scrollToHighlightedWord(): void {
    afterNextRender(() => {
      const container = this.textContainer()?.nativeElement;
      const element = container?.querySelector<HTMLElement>('.highlight');
      if (!container || !element) return;
      const box = container.getBoundingClientRect();
      const word = element.getBoundingClientRect();
      const margin = box.height * 0.25;
      const above = word.top < box.top + margin && container.scrollTop > 0;
      const below = word.bottom > box.bottom - margin;
      if (above || below) {
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }
    }, { injector: this.injector });
  }
}
