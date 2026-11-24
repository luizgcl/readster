import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Root: the landing page (/) and the app screens (/app/...) bring their own headers. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="min-h-dvh w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex flex-col">
      <router-outlet />
    </div>
  `,
})
export class AppComponent {}
