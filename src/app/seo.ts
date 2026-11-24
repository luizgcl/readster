import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';

export const SITE_URL = 'https://readster.luizgcl.com.br';

export const SITE_DESCRIPTION =
  'Cole um texto ou abra um PDF e leia no seu ritmo: o Readster destaca as palavras, avança sozinho na velocidade '
  + 'que você escolher e lembra onde você parou. Grátis, sem cadastro, e o texto fica no seu navegador.';

/**
 * Per-page search tags, rendered on the server/prerender: canonical URL, description and whether
 * search engines should index the page. Call from a component's constructor.
 */
export function setPageSeo(options: { path: string; description?: string; index: boolean }) {
  const document = inject(DOCUMENT);
  const meta = inject(Meta);
  const url = SITE_URL + options.path;

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  meta.updateTag({ property: 'og:url', content: url });
  if (options.description) {
    meta.updateTag({ name: 'description', content: options.description });
    meta.updateTag({ property: 'og:description', content: options.description });
  }
  // The app screens hold each visitor's own texts: nothing useful to index, but links can be followed.
  meta.updateTag({ name: 'robots', content: options.index ? 'index, follow' : 'noindex, follow' });
}

/** Adds (or replaces) a JSON-LD block in <head>, identified by id. */
export function setStructuredData(id: string, data: object) {
  const document = inject(DOCUMENT);
  document.getElementById(id)?.remove();
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  // Escape "<" so text inside the JSON can never close the script tag.
  script.textContent = JSON.stringify(data).replace(/</g, '\u003c');
  document.head.appendChild(script);
}
