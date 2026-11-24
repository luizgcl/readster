import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeToggleComponent } from '../components/theme-toggle.component';

/** Frame of the app screens (/app/...): logo to the landing page and the theme toggle. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, ThemeToggleComponent],
  host: { class: 'flex flex-col flex-1' },
  template: `
    <header class="bg-white dark:bg-gray-900 w-full px-4 h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
      <a routerLink="/" class="focus-ring rounded-md flex items-center gap-2 font-extrabold text-3xl tracking-tight lowercase" aria-label="Readster: página inicial">
        <img src="logo.svg" alt="" width="34" height="31" />
        Readster
      </a>
      <app-theme-toggle />
    </header>
    <main class="flex flex-col flex-1 items-center px-3 py-4 sm:px-4 sm:py-6 gap-4">
      <router-outlet />
    </main>
  `,
})
export class AppShellComponent {}
