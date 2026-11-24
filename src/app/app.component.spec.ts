import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';
import { addReadingStats, addToLibrary, loadLibrary, loadPrefs, loadStats, updateProgress } from './preferences';
import { makePdf } from './pdf.spec';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;
  let el: HTMLElement;

  async function create() {
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.autoDetectChanges();
    await fixture.whenStable(); // runs afterNextRender (browser-only state)
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: appConfig.providers,
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  async function submit(text: string | null) {
    app.form.setValue({ text });
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('should render title and value proposition', async () => {
    await create();
    expect(el.querySelector('h1')?.textContent).toContain('Readster');
    expect(el.textContent).toContain('Seus textos ficam salvos apenas no seu navegador');
  });

  it('should not start reading with empty or whitespace-only text', async () => {
    await create();
    for (const text of [null, '', '   \n\t ']) {
      await submit(text);
      expect(app.isReaderMode).withContext(JSON.stringify(text)).toBeFalse();
    }
    expect(el.querySelector('#text-error')?.textContent).toContain('Insira algum texto');
  });

  it('should show word count and reading time while typing', async () => {
    await create();
    app.form.setValue({ text: 'um dois três' });
    await fixture.whenStable();
    expect(el.querySelector('#text-stats')?.textContent).toContain('3 palavras · menos de 1 min a 250 palavras/min');
  });

  const libraryText = () => el.querySelector('[aria-labelledby="library-title"]')?.textContent ?? '';
  const button = (label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it('should save the text to the library and resume from where it stopped', async () => {
    await create();
    expect(el.querySelector('#library-title')).toBeNull();
    await submit('um dois três quatro');
    expect(el.querySelector('app-reader')).toBeTruthy();
    button('Próximas palavras').click();
    await fixture.whenStable();

    el.querySelector<HTMLButtonElement>('app-reader button.bg-red-300')!.click();
    await fixture.whenStable();
    expect(app.isReaderMode).toBeFalse();
    expect(libraryText()).toContain('um dois três quatro');
    expect(libraryText()).toContain('25% lido');

    button('Continuar: um dois três quatro').click();
    await fixture.whenStable();
    expect(Array.from(el.querySelectorAll('.highlight')).map(e => e.textContent)).toEqual(['dois']);
  });

  it('should list texts saved in a previous visit and restart finished ones', async () => {
    const item = addToLibrary('a b c d')!;
    updateProgress(item.id, 4);
    await create();
    expect(libraryText()).toContain('Concluído');

    button('Ler de novo: a b c d').click();
    await fixture.whenStable();
    expect(Array.from(el.querySelectorAll('.highlight')).map(e => e.textContent)).toEqual(['a']);
  });

  it('should delete a text only after confirmation', async () => {
    addToLibrary('para excluir');
    await create();
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    button('Excluir: para excluir').click();
    await fixture.whenStable();
    expect(loadLibrary().length).toBe(1);

    confirmSpy.and.returnValue(true);
    button('Excluir: para excluir').click();
    await fixture.whenStable();
    expect(loadLibrary()).toEqual([]);
    expect(el.querySelector('#library-title')).toBeNull();
  });

  it('should show a discreet reading summary that can be reset', async () => {
    addToLibrary('um texto');
    await create();
    expect(el.querySelector('#reading-stats')).withContext('nothing read yet').toBeNull();

    addReadingStats(1250, 5 * 60_000);
    app.handleQuitReading(); // reloads library and stats, as after a reading
    await fixture.whenStable();
    expect(el.querySelector('#reading-stats')?.textContent).toContain('Você leu 1.250 palavras em 5 min, média de 250 palavras/min.');

    spyOn(window, 'confirm').and.returnValue(true);
    button('Zerar estatísticas de leitura').click();
    await fixture.whenStable();
    expect(loadStats()).toEqual({ words: 0, ms: 0 });
    expect(el.querySelector('#reading-stats')).toBeNull();
  });

  it('should still read, with a warning, when the text cannot be saved', async () => {
    await create();
    spyOn(Storage.prototype, 'setItem').and.throwError(new DOMException('full', 'QuotaExceededError'));
    await submit('um dois');
    expect(app.isReaderMode).toBeTrue();
    expect(el.textContent).toContain('Não foi possível salvar este texto');
  });

  describe('importing a file', () => {
    async function pick(file: File, wait = 50) {
      const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
      await new Promise(resolve => setTimeout(resolve, wait)); // file reading is async
      await fixture.whenStable();
    }

    it('fills the text area from a .txt file', async () => {
      await create();
      await pick(new File(['Olá, mundo\nsegunda linha'], 'texto.txt', { type: 'text/plain' }));
      expect(app.form.value.text).toBe('Olá, mundo\nsegunda linha');
      expect(app.importError).toBe('');
    });

    it('rejects unsupported, empty and oversized files', async () => {
      await create();
      await pick(new File(['PK'], 'doc.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
      expect(app.importError).toContain('Formato não suportado');
      await pick(new File(['   '], 'vazio.txt', { type: 'text/plain' }));
      expect(app.importError).toContain('vazio');
      await pick(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.txt', { type: 'text/plain' }));
      expect(app.importError).toContain('muito grande');
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('muito grande');
      expect(app.form.value.text).toBeNull();
    });

    it('fills the text area from a PDF', async () => {
      await create();
      await pick(makePdf([[['Texto do PDF', 700]]]), 1500);
      expect(app.importError).toBe('');
      expect(app.importing).toBeFalse();
      expect(app.form.value.text).toBe('Texto do PDF');
    });

    it('explains when a PDF has no text (scanned) or is too large', async () => {
      await create();
      await pick(makePdf([[]]), 1500);
      expect(app.importError).toContain('PDFs escaneados');
      await pick(new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' }));
      expect(app.importError).toContain('O limite é 20 MB');
      expect(app.form.value.text).toBeNull();
    });
  });

  it('should cycle and persist the theme', async () => {
    await create();
    expect(app.theme()).toBe('auto');
    app.cycleTheme();
    expect(app.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
    app.cycleTheme();
    expect(app.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(loadPrefs().theme).toBe('dark');
  });
});
