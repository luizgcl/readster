import { afterNextRender, Component, signal } from '@angular/core';

export const REPO_URL = 'https://github.com/luizgcl/readster';
const CONTRIBUTORS_API = 'https://api.github.com/repos/luizgcl/readster/contributors?per_page=30';

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

/**
 * People who contributed to the repository, read from the GitHub API in the browser.
 * Placed inside @defer (on viewport), so GitHub is only contacted when the section is seen;
 * on any failure (offline, rate limit) it falls back to a link to the contributors page.
 */
@Component({
  selector: 'app-contributors',
  template: `
    @if (contributors().length) {
      <ul class="flex flex-wrap gap-3" aria-label="Contribuidores">
        @for (person of contributors(); track person.login) {
          <li>
            <a [href]="person.html_url" target="_blank" rel="noopener noreferrer"
              class="focus-ring flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 pl-1 pr-3 min-h-11 hover:border-brand-400"
              [attr.aria-label]="person.login + ', ' + person.contributions + ' contribuições'">
              <img [src]="person.avatar_url + '&s=64'" alt="" width="32" height="32" class="size-8 rounded-full" loading="lazy" />
              <span class="text-sm font-medium">{{ person.login }}</span>
            </a>
          </li>
        }
      </ul>
    } @else if (failed()) {
      <a [href]="repoUrl + '/graphs/contributors'" target="_blank" rel="noopener noreferrer" class="underline hover:no-underline rounded focus-ring">
        Ver contribuidores no GitHub
      </a>
    } @else {
      <p class="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">Carregando contribuidores…</p>
    }
  `,
})
export class ContributorsComponent {
  readonly repoUrl = REPO_URL;
  contributors = signal<Contributor[]>([]);
  failed = signal(false);

  constructor() {
    afterNextRender(async () => {
      try {
        const response = await fetch(CONTRIBUTORS_API, { headers: { Accept: 'application/vnd.github+json' } });
        if (!response.ok) throw new Error(String(response.status));
        const people = (await response.json()) as Contributor[];
        const humans = people.filter(person => person.type === 'User'); // skip bots
        this.contributors.set(humans);
        this.failed.set(!humans.length);
      } catch {
        this.failed.set(true);
      }
    });
  }
}
