import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReaderComponent } from './components/reader/reader.component';
import { LucideAngularModule } from 'lucide-angular';
import { countWords, formatDuration, formatReadingTime } from './reading';
import {
  addToLibrary, clearStats, LibraryItem, loadStats, ReadingStats, LIMITS, loadLibrary, loadPrefs, removeFromLibrary, savePrefs, Theme,
} from './preferences';
import { extractPdfText, PdfImportError } from './pdf';

const MB = 1024 * 1024;
const MAX_TEXT_BYTES = 5 * MB;
const MAX_PDF_BYTES = 20 * MB;

const THEME_ORDER: Theme[] = ['auto', 'light', 'dark'];
const THEME_INFO: Record<Theme, { icon: string; label: string }> = {
  auto: { icon: 'monitor', label: 'automático' },
  light: { icon: 'sun', label: 'claro' },
  dark: { icon: 'moon', label: 'escuro' },
};

@Component({
  selector: 'app-root',
  imports: [ReaderComponent, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private document = inject(DOCUMENT);

  formBuilder = inject(FormBuilder)
  form: FormGroup

  isReaderMode = false;
  startIndex = 0;
  itemId: string | null = null;
  /** Shown when the text could not be saved (e.g. storage full); reading still works. */
  storageWarning = false;
  importError = '';
  /** True while a PDF is being read, which can take a few seconds. */
  importing = false;

  // Browser-only state, filled after hydration so it never mismatches the server render.
  library = signal<LibraryItem[]>([]);
  stats = signal<ReadingStats>({ words: 0, ms: 0 });
  theme = signal<Theme>('auto');
  wpm = signal<number>(LIMITS.wpm.default);

  constructor() {
    this.form = this.formBuilder.group({
      // pattern rejects whitespace-only text, which would open an empty reader
      text: [null, [Validators.required, Validators.pattern(/\S/)]]
    })

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const prefs = loadPrefs();
      this.theme.set(prefs.theme);
      this.wpm.set(prefs.wpm);
      this.library.set(loadLibrary());
    this.stats.set(loadStats());

      const media = window.matchMedia?.('(prefers-color-scheme: dark)');
      const onSystemChange = () => this.applyTheme();
      media?.addEventListener('change', onSystemChange);
      destroyRef.onDestroy(() => media?.removeEventListener('change', onSystemChange));
      this.applyTheme();
    });
  }

  get showTextError(): boolean {
    const control = this.form.controls['text'];
    return control.invalid && control.touched;
  }

  get wordCount(): number {
    return countWords(this.form.value.text ?? '');
  }

  get readingTime(): string {
    return formatReadingTime(this.wordCount, this.wpm());
  }

  get themeInfo() {
    return THEME_INFO[this.theme()];
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const item = addToLibrary(this.form.value.text);
    this.storageWarning = !item;
    this.open(this.form.value.text, item?.index ?? 0, item?.id ?? null);
  }

  openItem(item: LibraryItem) {
    // A finished text starts over; anything else resumes where it stopped.
    this.open(item.text, item.index >= item.words ? 0 : item.index, item.id);
  }

  removeItem(item: LibraryItem) {
    if (confirm(`Excluir "${item.title}" da biblioteca? Esta ação não pode ser desfeita.`)) {
      removeFromLibrary(item.id);
      this.library.set(loadLibrary());
    }
  }

  /** One discreet line about timed reading; empty until there is something to show. */
  get statsSummary(): string {
    const { words, ms } = this.stats();
    if (!words || !ms) return '';
    const wpm = Math.round(words / (ms / 60000));
    return `Você leu ${words.toLocaleString('pt-BR')} palavras em ${formatDuration(ms)}, `
      + `média de ${wpm} palavras/min.`;
  }

  resetStats() {
    if (confirm('Zerar suas estatísticas de leitura? Esta ação não pode ser desfeita.')) {
      clearStats();
      this.stats.set(loadStats());
    }
  }

  percentRead(item: LibraryItem): number {
    return item.words ? Math.round((Math.min(item.index, item.words) / item.words) * 100) : 0;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow picking the same file again
    this.importError = '';
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf && !(file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name))) {
      this.importError = 'Formato não suportado. Escolha um arquivo .txt ou .pdf.';
      return;
    }
    const limit = isPdf ? MAX_PDF_BYTES : MAX_TEXT_BYTES;
    if (file.size > limit) {
      this.importError = `Arquivo muito grande. O limite é ${limit / MB} MB.`;
      return;
    }
    let text: string;
    if (isPdf) {
      this.importing = true;
      try {
        text = await extractPdfText(file);
      } catch (error) {
        this.importError = error instanceof PdfImportError ? error.message : 'Não foi possível ler este PDF.';
        return;
      } finally {
        this.importing = false;
      }
      if (!text.trim()) {
        this.importError = 'Não encontramos texto neste PDF. PDFs escaneados (só imagens) não são suportados.';
        return;
      }
    } else {
      // ponytail: decodes as UTF-8 only; files in other encodings (e.g. Latin-1) show garbled accents.
      text = await file.text();
    }
    if (!text.trim()) {
      this.importError = 'O arquivo está vazio.';
      return;
    }
    this.form.setValue({ text });
  }

  handleQuitReading() {
    this.isReaderMode = false
    this.storageWarning = false;
    this.form.reset()
    this.wpm.set(loadPrefs().wpm);
    this.library.set(loadLibrary());
    this.stats.set(loadStats());
  }

  private open(text: string, startIndex: number, itemId: string | null) {
    this.form.setValue({ text });
    this.startIndex = startIndex;
    this.itemId = itemId;
    this.isReaderMode = true;
  }

  cycleTheme() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(this.theme()) + 1) % THEME_ORDER.length];
    this.theme.set(next);
    savePrefs({ theme: next });
    this.applyTheme();
  }

  // Mirrors the inline script in index.html, which applies the theme before first paint.
  private applyTheme() {
    const theme = this.theme();
    const dark = theme === 'dark'
      || (theme === 'auto' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const root = this.document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  }
}
