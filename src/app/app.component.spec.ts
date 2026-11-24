import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ThemeToggleComponent } from './components/theme-toggle.component';
import { LandingPage } from './pages/landing.page';
import { appConfig } from './app.config';
import { NewReadingPage } from './pages/new-reading.page';
import { ReadingPage } from './pages/reading.page';
import { addReadingStats, addToLibrary, loadLibrary, loadPrefs, loadStats, updateProgress } from './preferences';
import { makePdf } from './pdf.spec';

beforeEach(async () => {
  localStorage.clear();
  await TestBed.configureTestingModule({ providers: appConfig.providers }).compileComponents();
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('ThemeToggleComponent', () => {
  it('cycles and persists the theme', async () => {
    const fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const toggle = fixture.componentInstance;

    expect(toggle.theme()).toBe('auto');
    toggle.cycle();
    expect(toggle.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
    toggle.cycle();
    expect(toggle.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(loadPrefs().theme).toBe('dark');
  });
});

describe('screens', () => {
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  beforeEach(async () => {
    harness = await RouterTestingHarness.create();
    harness.fixture.autoDetectChanges();
  });

  async function go(url: string) {
    await harness.navigateByUrl(url);
    await settle();
  }

  // whenStable runs afterNextRender (localStorage is browser-only) and pending navigations.
  async function settle() {
    await harness.fixture.whenStable();
    el = screen().nativeElement;
  }

  /** The routed screen: inside the app shell for /app routes, the landing page otherwise. */
  const screen = () => harness.fixture.debugElement.query(By.css('app-shell router-outlet + *')) ?? harness.routeDebugElement!;

  const button = (label: string) => el.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
  const page = <T>() => screen().componentInstance as T;
  const path = () => TestBed.inject(Router).url;

  describe('library', () => {
    it('invites to start when empty', async () => {
      await go('/app');
      expect(el.textContent).toContain('Nenhum texto por aqui ainda');
      expect(el.querySelector('a[href="/app/nova"]')?.textContent).toContain('Começar uma leitura');
    });

    it('lists saved texts, resumes and restarts finished ones', async () => {
      const resumed = addToLibrary('um dois três quatro')!;
      updateProgress(resumed.id, 1);
      const finished = addToLibrary('a b c d')!;
      updateProgress(finished.id, 4);
      await go('/app');
      expect(el.textContent).toContain('25% lido');
      expect(el.textContent).toContain('Concluído');

      button('Continuar: um dois três quatro').click();
      await settle();
      expect(page<unknown>()).toBeInstanceOf(ReadingPage);
      expect(Array.from(el.querySelectorAll('.word.highlight')).map(e => e.textContent)).toEqual(['dois']);

      await go('/app');
      button('Ler de novo: a b c d').click();
      await settle();
      expect(Array.from(el.querySelectorAll('.word.highlight')).map(e => e.textContent)).toEqual(['a']);
    });

    it('deletes a text only after confirmation', async () => {
      addToLibrary('para excluir');
      await go('/app');
      const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
      button('Excluir: para excluir').click();
      await settle();
      expect(loadLibrary().length).toBe(1);

      confirmSpy.and.returnValue(true);
      button('Excluir: para excluir').click();
      await settle();
      expect(loadLibrary()).toEqual([]);
      expect(el.textContent).toContain('Nenhum texto por aqui ainda');
    });

    it('shows a discreet reading summary that can be reset', async () => {
      addToLibrary('um texto');
      addReadingStats(1250, 5 * 60_000);
      await go('/app');
      expect(el.querySelector('#reading-stats')?.textContent).toContain('Você leu 1.250 palavras em 5 min, média de 250 palavras/min.');

      spyOn(window, 'confirm').and.returnValue(true);
      button('Zerar estatísticas de leitura').click();
      await settle();
      expect(loadStats()).toEqual({ words: 0, ms: 0 });
      expect(el.querySelector('#reading-stats')).toBeNull();
    });
  });

  describe('new reading', () => {
    let form: NewReadingPage;

    beforeEach(async () => {
      await go('/app/nova');
      form = page<NewReadingPage>();
    });

    async function submit(text: string | null) {
      form.form.setValue({ text });
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      await settle();
    }

    it('does not start with empty or whitespace-only text', async () => {
      for (const text of [null, '', '   \n\t ']) {
        await submit(text);
        expect(page<unknown>()).withContext(JSON.stringify(text)).toBe(form);
      }
      expect(el.querySelector('#text-error')?.textContent).toContain('Insira algum texto');
    });

    it('shows word count and reading time while typing', async () => {
      form.form.setValue({ text: 'um dois três' });
      await settle();
      expect(el.querySelector('#text-stats')?.textContent).toContain('3 palavras · menos de 1 min a 250 palavras/min');
    });

    it('saves the text, opens it with its title and goes back to the library', async () => {
      await submit('um dois três quatro');
      const [item] = loadLibrary();
      expect(path()).toBe(`/app/ler/${item.id}`);
      expect(el.querySelector('app-reader h1')?.textContent).toContain('um dois três quatro');

      button('Voltar à biblioteca').click();
      await settle();
      expect(path()).toBe('/app');
    });

    it('still reads, with a warning, when the text cannot be saved', async () => {
      spyOn(Storage.prototype, 'setItem').and.throwError(new DOMException('full', 'QuotaExceededError'));
      await submit('um dois');
      expect(path()).toBe('/app/ler/rascunho');
      expect(el.textContent).toContain('Não foi possível salvar este texto');
      expect(el.querySelector('.word.highlight')?.textContent).toBe('um');
    });

    describe('importing a file', () => {
      async function pick(file: File, wait = 50) {
        const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, wait)); // file reading is async
        await settle();
      }

      it('fills the text area from a .txt file', async () => {
        await pick(new File(['Olá, mundo\nsegunda linha'], 'texto.txt', { type: 'text/plain' }));
        expect(form.form.value.text).toBe('Olá, mundo\nsegunda linha');
        expect(form.importError()).toBe('');
      });

      it('rejects unsupported, empty and oversized files', async () => {
        await pick(new File(['PK'], 'doc.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
        expect(form.importError()).toContain('Formato não suportado');
        await pick(new File(['   '], 'vazio.txt', { type: 'text/plain' }));
        expect(form.importError()).toContain('vazio');
        await pick(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.txt', { type: 'text/plain' }));
        expect(form.importError()).toContain('muito grande');
        expect(el.querySelector('[role="alert"]')?.textContent).toContain('muito grande');
        expect(form.form.value.text).toBe('');
      });

      it('fills the text area from a PDF', async () => {
        await pick(makePdf([[['Texto do PDF', 700]]]), 1500);
        expect(form.importError()).toBe('');
        expect(form.importing()).toBeFalse();
        expect(form.form.value.text).toBe('Texto do PDF');
      });

      it('explains when a PDF has no text (scanned) or is too large', async () => {
        await pick(makePdf([[]]), 1500);
        expect(form.importError()).toContain('PDFs escaneados');
        await pick(new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' }));
        expect(form.importError()).toContain('O limite é 20 MB');
        expect(form.form.value.text).toBe('');
      });
    });
  });

  it('says when a text is not in this browser', async () => {
    await go('/app/ler/nao-existe');
    expect(el.textContent).toContain('Texto não encontrado');
  });

  it('sends unknown addresses to the landing page', async () => {
    await go('/qualquer-coisa');
    expect(page<unknown>()).toBeInstanceOf(LandingPage);
  });

  describe('landing page', () => {
    it('presents the app with calls to open it, sections and honest answers', async () => {
      await go('/');
      expect(el.querySelector('h1')?.textContent).toContain('Leia no seu ritmo');
      expect(el.querySelectorAll('a[href="/app"]').length).toBeGreaterThan(1);
      expect(el.querySelector('a[href="/app/nova"]')?.textContent).toContain('Começar a ler');
      for (const id of ['demo', 'como-funciona', 'perguntas']) {
        expect(el.querySelector('#' + id)).withContext(id).toBeTruthy();
      }
      expect(el.querySelector('#perguntas')?.textContent).toContain('Não prometemos isso');
    });

    it('shows the logo link to the library inside the app', async () => {
      await go('/app');
      expect(el.ownerDocument.querySelector('app-shell a[href="/app"]')?.textContent).toContain('Readster');
    });
  });
});
