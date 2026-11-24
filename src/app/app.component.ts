import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from './components/confirm-dialog.component';

/** Root: the landing page (/) and the app screens (/app/...) bring their own headers. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogComponent],
  template: `
    <div class="min-h-dvh w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex flex-col">
      <router-outlet />
    </div>
    <app-confirm-dialog />
  `,
})
export class AppComponent {}
