import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReaderComponent } from './components/reader/reader.component';
import { LucideAngularModule } from 'lucide-angular';
import { countWords, formatReadingTime } from './reading';
import { LIMITS, loadPrefs, loadSession, savePrefs, saveSession, Session, Theme } from './preferences';

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

  // Browser-only state, filled after hydration so it never mismatches the server render.
  savedSession = signal<(Session & { percent: number }) | null>(null);
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
      this.refreshSavedSession();

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

    this.startIndex = 0;
    this.isReaderMode = true;
  }

  continueReading() {
    const session = this.savedSession();
    if (!session) return;
    this.form.setValue({ text: session.text });
    this.startIndex = session.index;
    this.isReaderMode = true;
  }

  discardSession() {
    saveSession(null);
    this.savedSession.set(null);
  }

  handleQuitReading() {
    this.isReaderMode = false
    this.form.reset()
    this.wpm.set(loadPrefs().wpm);
    this.refreshSavedSession();
  }

  cycleTheme() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(this.theme()) + 1) % THEME_ORDER.length];
    this.theme.set(next);
    savePrefs({ theme: next });
    this.applyTheme();
  }

  private refreshSavedSession() {
    const session = loadSession();
    const total = session ? countWords(session.text) : 0;
    this.savedSession.set(session && total
      ? { ...session, percent: Math.round((Math.min(session.index, total) / total) * 100) }
      : null);
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
