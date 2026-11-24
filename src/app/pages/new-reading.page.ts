import { afterNextRender, Component, inject, Injectable, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { setPageSeo } from '../seo';
import { countWords, formatReadingTime } from '../reading';
import { addToLibrary, LIMITS, loadPrefs } from '../preferences';
import { extractPdfText, PdfImportError } from '../pdf';

const MB = 1024 * 1024;
const MAX_TEXT_BYTES = 5 * MB;
const MAX_PDF_BYTES = 20 * MB;

/** Route id for a text that could not be saved (storage full). */
export const UNSAVED_ID = 'rascunho';

/** Holds a text that could not be saved, for the reader to open. Lost on reload, like any unsaved text. */
@Injectable({ providedIn: 'root' })
export class UnsavedText {
  text = '';
}

@Component({
  selector: 'app-new-reading-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule],
  host: { class: 'w-full max-w-3xl flex flex-col gap-4' },
  template: `
    <div class="flex items-center gap-2">
      <a routerLink="/app" class="btn btn-ghost px-2 -ml-1" aria-label="Voltar à biblioteca">
        <lucide-icon name="arrow-left" size="20" aria-hidden="true" />
        Biblioteca
      </a>
    </div>
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="card flex flex-col p-4 gap-3">
      <div>
        <h1 class="text-2xl font-bold">Nova leitura</h1>
        <p class="text-gray-700 dark:text-gray-300 mt-1">
          Cole um texto ou abra um arquivo. Ele fica salvo apenas no seu navegador.
        </p>
      </div>
      <label for="text" class="font-medium">Texto</label>
      <!-- Grows with the text (field-sizing) up to half the screen, so the start button stays in view. -->
      <textarea
        id="text"
        rows="8"
        class="field p-3 min-h-44 max-h-[55dvh] resize-y [field-sizing:content] -mt-2"
        placeholder="Cole aqui o texto que deseja ler"
        formControlName="text"
        [attr.aria-invalid]="showTextError"
        aria-describedby="text-error text-stats"></textarea>
      <div class="flex flex-wrap justify-between gap-x-2 text-sm">
        <p id="text-error" class="text-red-700 dark:text-red-400" aria-live="polite">
          @if (showTextError) {
            Insira algum texto para iniciar a leitura.
          }
        </p>
        <p class="text-gray-700 dark:text-gray-300" role="status">{{ importing() ? 'Lendo PDF…' : '' }}</p>
        <p class="text-red-700 dark:text-red-400" role="alert">{{ importError() }}</p>
        <p id="text-stats" class="text-gray-700 dark:text-gray-300 ml-auto">
          @if (wordCount) {
            {{ wordCount }} palavras · {{ readingTime }} a {{ wpm() }} palavras/min
          }
        </p>
      </div>
      <div class="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
        <label class="btn btn-secondary cursor-pointer focus-within:ring-2 focus-within:ring-brand-600 dark:focus-within:ring-brand-300">
          <lucide-icon name="file-text" size="18" aria-hidden="true" />
          Abrir arquivo .txt ou .pdf
          <input type="file" accept=".txt,.md,text/plain,.pdf,application/pdf" class="sr-only"
            [disabled]="importing()" (change)="onFileSelected($event)" />
        </label>
        <button type="submit" class="btn btn-primary sm:ml-auto sm:min-w-48">
          <lucide-icon name="play" size="20" aria-hidden="true" />
          Iniciar leitura
        </button>
      </div>
    </form>
  `,
})
export class NewReadingPage {
  private router = inject(Router);
  private unsaved = inject(UnsavedText);

  form = inject(FormBuilder).group({
    // pattern rejects whitespace-only text, which would open an empty reader
    text: ['' as string | null, [Validators.required, Validators.pattern(/\S/)]],
  });
  importError = signal('');
  /** True while a PDF is being read, which can take a few seconds. */
  importing = signal(false);
  wpm = signal<number>(LIMITS.wpm.default);

  constructor() {
    setPageSeo({ path: '/app/nova', index: false });
    afterNextRender(() => this.wpm.set(loadPrefs().wpm));
  }

  get showTextError(): boolean {
    const control = this.form.controls.text;
    return control.invalid && control.touched;
  }

  get wordCount(): number {
    return countWords(this.form.value.text ?? '');
  }

  get readingTime(): string {
    return formatReadingTime(this.wordCount, this.wpm());
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const text = this.form.value.text!;
    const item = addToLibrary(text);
    // Storage full or blocked: still read it, without keeping progress.
    this.unsaved.text = item ? '' : text;
    this.router.navigate(['/app/ler', item?.id ?? UNSAVED_ID]);
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow picking the same file again
    this.importError.set('');
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf && !(file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name))) {
      this.importError.set('Formato não suportado. Escolha um arquivo .txt ou .pdf.');
      return;
    }
    const limit = isPdf ? MAX_PDF_BYTES : MAX_TEXT_BYTES;
    if (file.size > limit) {
      this.importError.set(`Arquivo muito grande. O limite é ${limit / MB} MB.`);
      return;
    }
    let text: string;
    if (isPdf) {
      this.importing.set(true);
      try {
        text = await extractPdfText(file);
      } catch (error) {
        this.importError.set(error instanceof PdfImportError ? error.message : 'Não foi possível ler este PDF.');
        return;
      } finally {
        this.importing.set(false);
      }
      if (!text.trim()) {
        this.importError.set('Não encontramos texto neste PDF. PDFs escaneados (só imagens) não são suportados.');
        return;
      }
    } else {
      // ponytail: decodes as UTF-8 only; files in other encodings (e.g. Latin-1) show garbled accents.
      text = await file.text();
    }
    if (!text.trim()) {
      this.importError.set('O arquivo está vazio.');
      return;
    }
    this.form.setValue({ text });
  }
}
