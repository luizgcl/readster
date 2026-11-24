import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';
import { loadPrefs, saveSession } from './preferences';

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
    expect(el.textContent).toContain('Seu texto fica apenas no seu navegador');
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

  it('should start reading with text and offer to continue after quitting', async () => {
    await create();
    await submit('um dois três quatro');
    expect(el.querySelector('app-reader')).toBeTruthy();
    (el.querySelector('button[aria-label="Próximas palavras"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    el.querySelector<HTMLButtonElement>('app-reader button.bg-red-300')!.click();
    await fixture.whenStable();
    expect(app.isReaderMode).toBeFalse();
    expect(el.textContent).toContain('leitura em andamento (25% lida)');

    app.continueReading();
    await fixture.whenStable();
    expect(Array.from(el.querySelectorAll('.highlight')).map(e => e.textContent)).toEqual(['dois']);
  });

  it('should restore a session saved in a previous visit and allow discarding it', async () => {
    saveSession({ text: 'a b c d', index: 2 });
    await create();
    expect(el.textContent).toContain('(50% lida)');

    app.discardSession();
    await fixture.whenStable();
    expect(el.textContent).not.toContain('leitura em andamento');
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
