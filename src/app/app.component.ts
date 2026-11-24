import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { loadPrefs, savePrefs, Theme } from './preferences';

const THEME_ORDER: Theme[] = ['auto', 'light', 'dark'];
const THEME_INFO: Record<Theme, { icon: string; label: string }> = {
  auto: { icon: 'monitor', label: 'automático' },
  light: { icon: 'sun', label: 'claro' },
  dark: { icon: 'moon', label: 'escuro' },
};

/** Shell: header with logo and theme toggle; each screen is a route. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, LucideAngularModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  private document = inject(DOCUMENT);

  // Browser-only state, filled after hydration so it never mismatches the server render.
  theme = signal<Theme>('auto');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.theme.set(loadPrefs().theme);
      const media = window.matchMedia?.('(prefers-color-scheme: dark)');
      const onSystemChange = () => this.applyTheme();
      media?.addEventListener('change', onSystemChange);
      destroyRef.onDestroy(() => media?.removeEventListener('change', onSystemChange));
      this.applyTheme();
    });
  }

  get themeInfo() {
    return THEME_INFO[this.theme()];
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
