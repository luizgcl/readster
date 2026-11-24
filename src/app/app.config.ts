import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import {
  LUCIDE_ICONS, LucideIconProvider,
  ArrowLeft, Bug, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Focus, Github, Gauge, Highlighter, Keyboard, Library, Minus, Monitor, Moon, Pause, Play, Plus, Settings, ShieldCheck, SkipBack, Sun, Trash2, X,
} from 'lucide-angular';

// Register only the icons in use; registering the full set added ~250 kB to the bundle.
const icons = {
  ArrowLeft, Bug, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Focus, Github, Gauge, Highlighter, Keyboard, Library, Minus, Monitor, Moon, Pause, Play, Plus, Settings, ShieldCheck, SkipBack, Sun, Trash2, X,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(),
    provideRouter(routes, withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) }
  ]
};
