import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import {
  ArrowLeft, ChevronLeft, ChevronRight, FileText, Keyboard, LUCIDE_ICONS, LucideIconProvider,
  Minus, Monitor, Moon, Pause, Play, Plus, Settings, SkipBack, Sun, Trash2, X,
} from 'lucide-angular';

// Register only the icons in use; registering the full set added ~250 kB to the bundle.
const icons = {
  ArrowLeft, ChevronLeft, ChevronRight, FileText, Keyboard, Minus, Monitor, Moon, Pause, Play, Plus, Settings, SkipBack, Sun, Trash2, X,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) }
  ]
};
