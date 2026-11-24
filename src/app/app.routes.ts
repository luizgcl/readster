import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Readster: leia no seu ritmo, com destaque palavra a palavra',
    loadComponent: () => import('./pages/landing.page').then(m => m.LandingPage),
  },
  {
    path: 'app',
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    children: [
      {
        path: '',
        title: 'Sua biblioteca | Readster',
        loadComponent: () => import('./pages/library.page').then(m => m.LibraryPage),
      },
      {
        path: 'nova',
        title: 'Nova leitura | Readster',
        loadComponent: () => import('./pages/new-reading.page').then(m => m.NewReadingPage),
      },
      {
        path: 'ler/:id',
        title: 'Lendo | Readster',
        loadComponent: () => import('./pages/reading.page').then(m => m.ReadingPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
