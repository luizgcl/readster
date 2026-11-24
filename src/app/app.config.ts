import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import {
  AArrowDown, AArrowUp, ArrowBigLeft, ArrowBigRight, LUCIDE_ICONS, LucideIconProvider,
  Monitor, Moon, Pause, Play, RotateCcw, SkipBack, Sun, X,
} from 'lucide-angular';

// Register only the icons in use; registering the full set added ~250 kB to the bundle.
const icons = {
  AArrowDown, AArrowUp, ArrowBigLeft, ArrowBigRight, Monitor, Moon, Pause, Play, RotateCcw, SkipBack, Sun, X,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(),
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) }
  ]
};
