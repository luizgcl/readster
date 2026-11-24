import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { loadPrefs, savePrefs, Theme } from '../preferences';

const THEME_ORDER: Theme[] = ['auto', 'light', 'dark'];
const THEME_INFO: Record<Theme, { icon: string; label: string }> = {
  auto: { icon: 'monitor', label: 'automático' },
  light: { icon: 'sun', label: 'claro' },
  dark: { icon: 'moon', label: 'escuro' },
};

/** Cycles auto → light → dark, persists it and follows the system while on auto. */
@Component({
  selector: 'app-theme-toggle',
  imports: [LucideAngularModule],
  template: `
    <button type="button" class="btn btn-ghost btn-icon"
      [attr.aria-label]="'Tema: ' + info.label + '. Clique para alternar.'"
      [title]="'Tema: ' + info.label"
      (click)="cycle()">
      <lucide-icon [name]="info.icon" aria-hidden="true" />
    </button>
  `,
})
export class ThemeToggleComponent {
  private document = inject(DOCUMENT);

  // Browser-only state, filled after hydration so it never mismatches the server render.
  theme = signal<Theme>('auto');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.theme.set(loadPrefs().theme);
      const media = window.matchMedia?.('(prefers-color-scheme: dark)');
      const onSystemChange = () => this.apply();
      media?.addEventListener('change', onSystemChange);
      destroyRef.onDestroy(() => media?.removeEventListener('change', onSystemChange));
      this.apply();
    });
  }

  get info() {
    return THEME_INFO[this.theme()];
  }

  cycle() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(this.theme()) + 1) % THEME_ORDER.length];
    this.theme.set(next);
    savePrefs({ theme: next });
    this.apply();
  }

  // Mirrors the inline script in index.html, which applies the theme before first paint.
  private apply() {
    const theme = this.theme();
    const dark = theme === 'dark'
      || (theme === 'auto' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const root = this.document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  }
}
