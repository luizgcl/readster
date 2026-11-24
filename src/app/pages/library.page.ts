import { afterNextRender, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { setPageSeo } from '../seo';
import { formatDuration } from '../reading';
import { ConfirmService } from '../components/confirm-dialog.component';
import { clearStats, LibraryItem, loadLibrary, loadStats, ReadingStats, removeFromLibrary } from '../preferences';

@Component({
  selector: 'app-library-page',
  imports: [RouterLink, LucideAngularModule],
  host: { class: 'w-full max-w-3xl flex flex-col gap-4' },
  template: `
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-2xl font-bold">Sua biblioteca</h1>
      @if (library().length) {
        <a routerLink="/app/nova" class="btn btn-primary">
          <lucide-icon name="plus" size="20" aria-hidden="true" />
          Nova leitura
        </a>
      }
    </div>

    @if (loaded()) {
      @if (library().length) {
        <section class="card p-4" aria-label="Textos salvos">
          @if (statsSummary) {
            <p id="reading-stats" class="text-sm text-gray-700 dark:text-gray-300 mb-1">
              {{ statsSummary }}
              <button type="button" class="focus-ring inline-flex min-h-11 -my-3 items-center px-1 underline hover:no-underline rounded"
                aria-label="Zerar estatísticas de leitura" (click)="resetStats()">Zerar</button>
            </p>
          }
          <ul class="divide-y divide-gray-200 dark:divide-gray-700">
            @for (item of library(); track item.id; let first = $first) {
              <li class="flex items-center gap-2 py-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium" [title]="item.title">{{ item.title }}</p>
                  <p class="text-sm text-gray-700 dark:text-gray-300">
                    {{ percentRead(item) === 100 ? 'Concluído' : percentRead(item) + '% lido' }}
                    · {{ item.words }} palavras<span class="hidden sm:inline"> · {{ formatDate(item.updatedAt) }}</span>
                  </p>
                </div>
                <!-- Icon-only on phones so the title keeps most of the row; the most recent text is the main action. -->
                <a class="btn px-0 w-11 sm:w-auto sm:px-4" [class]="first ? 'btn-primary' : 'btn-secondary'"
                  [routerLink]="['/app/ler', item.id]"
                  [attr.aria-label]="(percentRead(item) === 100 ? 'Ler de novo: ' : 'Continuar: ') + item.title">
                  <lucide-icon name="play" size="18" aria-hidden="true" />
                  <span class="hidden sm:inline">{{ percentRead(item) === 100 ? 'Ler de novo' : 'Continuar' }}</span>
                </a>
                <button type="button" class="btn btn-ghost btn-icon"
                  [attr.aria-label]="'Excluir: ' + item.title" title="Excluir"
                  (click)="removeItem(item)">
                  <lucide-icon name="trash-2" size="18" aria-hidden="true" />
                </button>
              </li>
            }
          </ul>
        </section>
      } @else {
        <section class="card p-6 sm:p-10 flex flex-col items-center text-center gap-3">
          <img src="logo.svg" alt="" width="56" height="52" />
          <h2 class="text-xl font-semibold">Nenhum texto por aqui ainda</h2>
          <p class="max-w-md text-gray-700 dark:text-gray-300">
            Cole um texto ou abra um arquivo .txt ou .pdf. O Readster guarda onde você parou,
            e tudo fica salvo apenas no seu navegador.
          </p>
          <a routerLink="/app/nova" class="btn btn-primary mt-2">
            <lucide-icon name="plus" size="20" aria-hidden="true" />
            Começar uma leitura
          </a>
        </section>
      }
    }
  `,
})
export class LibraryPage {
  // localStorage only exists in the browser: load after hydration and render nothing until then,
  // so returning readers never see the empty state flash.
  private confirm = inject(ConfirmService);
  loaded = signal(false);
  library = signal<LibraryItem[]>([]);
  stats = signal<ReadingStats>({ words: 0, ms: 0 });

  constructor() {
    setPageSeo({ path: '/app', index: false });
    afterNextRender(() => {
      this.library.set(loadLibrary());
      this.stats.set(loadStats());
      this.loaded.set(true);
    });
  }

  /** One discreet line about timed reading; empty until there is something to show. */
  get statsSummary(): string {
    const { words, ms } = this.stats();
    if (!words || !ms) return '';
    const wpm = Math.round(words / (ms / 60000));
    return `Você leu ${words.toLocaleString('pt-BR')} palavras em ${formatDuration(ms)}, `
      + `média de ${wpm} palavras/min.`;
  }

  async resetStats() {
    const confirmed = await this.confirm.ask({
      title: 'Zerar estatísticas?',
      message: 'As palavras lidas, o tempo e a média voltam a zero. Seus textos continuam na biblioteca.',
      confirmLabel: 'Zerar',
      danger: true,
    });
    if (confirmed) {
      clearStats();
      this.stats.set(loadStats());
    }
  }

  async removeItem(item: LibraryItem) {
    const confirmed = await this.confirm.ask({
      title: 'Excluir texto?',
      message: `"${item.title}" e o progresso dele serão apagados deste navegador. Não dá para desfazer.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (confirmed) {
      removeFromLibrary(item.id);
      this.library.set(loadLibrary());
    }
  }

  percentRead(item: LibraryItem): number {
    return item.words ? Math.round((Math.min(item.index, item.words) / item.words) * 100) : 0;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
