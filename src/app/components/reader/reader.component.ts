import {
  afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, input, OnInit, output, viewChild,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FontSizePipe } from '../../pipes/font-size.pipe';
import { FormsModule } from '@angular/forms';
import { chunkDelayMs, formatReadingTime, tokenize } from '../../reading';
import { LIMITS, loadPrefs, savePrefs, saveSession } from '../../preferences';

@Component({
  selector: 'app-reader',
  imports: [LucideAngularModule, FontSizePipe, FormsModule],
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class ReaderComponent implements OnInit {
  private injector = inject(Injector);
  private textContainer = viewChild.required<ElementRef<HTMLElement>>('textContainer');

  text = input.required<string>();
  /** Word index to resume from. */
  startIndex = input(0);
  quitReading = output();

  private tokens = computed(() => tokenize(this.text()));
  words = computed(() => this.tokens().words);
  paragraphs = computed(() => this.tokens().paragraphs);

  readonly limits = LIMITS;
  readonly highlightOptions = Array.from({ length: LIMITS.highlightWords.max }, (_, i) => i + 1);

  private prefs = loadPrefs();
  fontSize = this.prefs.fontSize;
  highlightWords = this.prefs.highlightWords;
  wpm = this.prefs.wpm;

  highlightedIndex = 0;
  playing = false;
  completed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

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

  // --- navigation -------------------------------------------------------

  highlightPreviousWord(): void {
    this.goTo(Math.max(0, this.highlightedIndex - this.highlightWords));
  }

  highlightNextWord(): void {
    if (!this.isAtEnd) {
      this.goTo(this.highlightedIndex + this.highlightWords);
    }
  }

  restart(): void {
    this.goTo(0);
  }

  private goTo(index: number): void {
    this.highlightedIndex = index;
    this.completed = false;
    saveSession({ text: this.text(), index });
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
      this.scheduleNextStep();
    }
  }

  pause(): void {
    this.playing = false;
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
    this.pause();
    this.completed = true;
    saveSession(null);
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

  private setFontSize(size: number): void {
    this.fontSize = Math.min(LIMITS.fontSize.max, Math.max(LIMITS.fontSize.min, size));
    savePrefs({ fontSize: this.fontSize });
  }

  onHighlightWordsChange(value: number): void {
    this.highlightWords = value;
    savePrefs({ highlightWords: value });
  }

  onWpmChange(value: number): void {
    this.wpm = value;
    savePrefs({ wpm: value });
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
      const container = this.textContainer().nativeElement;
      const element = container.querySelector<HTMLElement>('.highlight');
      if (!element) return;
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
