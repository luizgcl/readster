import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReaderComponent } from './components/reader/reader.component';
import { LucideAngularModule } from 'lucide-angular';
import { countWords, formatReadingTime } from './reading';
import {
  addToLibrary, LibraryItem, LIMITS, loadLibrary, loadPrefs, removeFromLibrary, savePrefs, Theme,
} from './preferences';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

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

  // Browser-only state, filled after hydration so it never mismatches the server render.
  library = signal<LibraryItem[]>([]);
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
    if (!(file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name))) {
      this.importError = 'Formato não suportado. Escolha um arquivo .txt.';
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      this.importError = 'Arquivo muito grande. O limite é 5 MB.';
      return;
    }
    // ponytail: decodes as UTF-8 only; files in other encodings (e.g. Latin-1) show garbled accents.
    const text = await file.text();
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
