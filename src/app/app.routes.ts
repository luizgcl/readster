import { Routes } from '@angular/router';

export const routes: Routes = [
  // Phase 2 puts the landing page here; until then the app opens straight away.
  { path: '', pathMatch: 'full', redirectTo: 'app' },
  {
    path: 'app',
    title: 'Sua biblioteca | Readster',
    loadComponent: () => import('./pages/library.page').then(m => m.LibraryPage),
  },
  {
    path: 'app/nova',
    title: 'Nova leitura | Readster',
    loadComponent: () => import('./pages/new-reading.page').then(m => m.NewReadingPage),
  },
  {
    path: 'app/ler/:id',
    title: 'Lendo | Readster',
    loadComponent: () => import('./pages/reading.page').then(m => m.ReadingPage),
  },
  { path: '**', redirectTo: 'app' },
];
