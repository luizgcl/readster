import { afterNextRender, Component, computed, ElementRef, inject, Injector, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FontSizePipe } from '../../pipes/font-size.pipe';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-reader',
    imports: [LucideAngularModule, FontSizePipe, FormsModule],
    templateUrl: './reader.component.html',
    styleUrl: './reader.component.scss'
})
export class ReaderComponent {
  private host = inject(ElementRef<HTMLElement>);
  private injector = inject(Injector);

  text = input.required<string>();
  quitReading = output();

  words = computed(() => this.text().trim().split(/\s+/).filter(Boolean));

  readonly minFontSize = 12;
  readonly maxFontSize = 32;
  readonly defaultFontSize = 20;
  readonly fontStep = 4;
  fontSize = this.defaultFontSize;

  readonly highlightOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  highlightWords = 1;
  highlightedIndex = 0;

  isHighlighted(index: number): boolean {
    return index >= this.highlightedIndex && index < this.highlightedIndex + this.highlightWords;
  }

  get isAtStart(): boolean {
    return this.highlightedIndex === 0;
  }

  get isAtEnd(): boolean {
    return this.highlightedIndex + this.highlightWords >= this.words().length;
  }

  highlightPreviousWord(): void {
    this.highlightedIndex = Math.max(0, this.highlightedIndex - this.highlightWords);
    this.scrollToHighlightedWord();
  }

  highlightNextWord(): void {
    if (this.isAtEnd) {
      return;
    }
    this.highlightedIndex += this.highlightWords;
    this.scrollToHighlightedWord();
  }

  increaseFontSize(): void {
    this.fontSize = Math.min(this.maxFontSize, this.fontSize + this.fontStep);
  }

  resetFontSize(): void {
    this.fontSize = this.defaultFontSize;
  }

  decreaseFontSize(): void {
    this.fontSize = Math.max(this.minFontSize, this.fontSize - this.fontStep);
  }

  // Runs after the DOM reflects the new index, otherwise we would scroll to the previous word.
  private scrollToHighlightedWord(): void {
    afterNextRender(() => {
      const element: HTMLElement | null = this.host.nativeElement.querySelector('.highlight');
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      element?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }, { injector: this.injector });
  }
}
