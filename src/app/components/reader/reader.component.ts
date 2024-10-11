import { Component, ElementRef, input, output, QueryList, Signal, viewChild, viewChildren } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FontSizePipe } from '../../pipes/font-size.pipe';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [LucideAngularModule, FontSizePipe],
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.scss'
})
export class ReaderComponent {

  text = input.required({
    transform: (value: string) => value.trim(),
  })

  quitReading = output();

  maxFontSteps = 4;
  currentFontStep = 1;

  fontSize = 20;

  highlightedIndex: number = 0;

  wordElements = viewChild<ElementRef>('wordElement');

  highlightPreviousWord(): void {
    if (this.highlightedIndex > 0) {
      this.highlightedIndex--;
    } else {
      this.highlightedIndex = 0;
    }

    this.scrollToHighlightedWord();
  }

  highlightNextWord(): void {
    const words = this.text().split(' ');
    if (this.highlightedIndex < words.length - 1) {
      this.highlightedIndex++;
    } else {
      this.highlightedIndex = 0;
    }

    this.scrollToHighlightedWord();
  }

  increaseFontSize() {
    if (this.currentFontStep < this.maxFontSteps) {
      this.currentFontStep++;
      this.fontSize += 4;
    }
  }

  resetFontSize() {
    this.currentFontStep = 1;
    this.fontSize = 20;
  }

  decreaseFontSize() {
    if (this.fontSize > 12) {
      this.currentFontStep--;
      this.fontSize -= 4;
    }
  }

  scrollToHighlightedWord(): void {
    const highlightedElement = this.wordElements();
    if (highlightedElement) {
      highlightedElement.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
