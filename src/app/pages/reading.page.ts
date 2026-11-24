import { afterNextRender, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReaderComponent } from '../components/reader/reader.component';
import { loadLibrary } from '../preferences';
import { UNSAVED_ID, UnsavedText } from './new-reading.page';

interface Opened {
  text: string;
  startIndex: number;
  /** null when the text could not be saved, so progress is not kept. */
  itemId: string | null;
}

@Component({
  selector: 'app-reading-page',
  imports: [ReaderComponent, RouterLink],
  host: { class: 'w-full flex flex-col items-center gap-4' },
  template: `
    @if (opened(); as opened) {
      @if (!opened.itemId) {
        <p class="w-full max-w-5xl text-sm rounded-md p-2 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" role="status">
          Não foi possível salvar este texto no navegador (o espaço pode estar cheio). Você pode ler normalmente, mas o progresso não será guardado.
        </p>
      }
      <app-reader [text]="opened.text" [startIndex]="opened.startIndex" [itemId]="opened.itemId"
        (quitReading)="router.navigate(['/app'])" />
    } @else if (notFound()) {
      <section class="card w-full max-w-3xl p-6 flex flex-col items-center text-center gap-3">
        <h1 class="text-xl font-semibold">Texto não encontrado</h1>
        <p class="text-gray-700 dark:text-gray-300">Ele pode ter sido excluído, ou foi salvo em outro navegador.</p>
        <a routerLink="/app" class="btn btn-primary">Ir para a biblioteca</a>
      </section>
    }
  `,
})
export class ReadingPage {
  router = inject(Router);
  /** Library item id, from the route. */
  id = input.required<string>();

  private unsaved = inject(UnsavedText);
  opened = signal<Opened | null>(null);
  notFound = signal(false);

  constructor() {
    // The library lives in localStorage, which only exists in the browser.
    afterNextRender(() => {
      if (this.id() === UNSAVED_ID) {
        const text = this.unsaved.text;
        this.show(text.trim() ? { text, startIndex: 0, itemId: null } : null);
        return;
      }
      const item = loadLibrary().find(other => other.id === this.id());
      // A finished text starts over; anything else resumes where it stopped.
      this.show(item ? { text: item.text, startIndex: item.index >= item.words ? 0 : item.index, itemId: item.id } : null);
    });
  }

  private show(opened: Opened | null) {
    this.opened.set(opened);
    this.notFound.set(!opened);
  }
}
