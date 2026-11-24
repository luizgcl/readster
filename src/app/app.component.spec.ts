import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: appConfig.providers,
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
    fixture.detectChanges();
  });

  function submit(text: string | null) {
    app.form.setValue({ text });
    (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('should render title', () => {
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Readster');
  });

  it('should not start reading with empty or whitespace-only text', () => {
    for (const text of [null, '', '   \n\t ']) {
      submit(text);
      expect(app.isReaderMode).withContext(JSON.stringify(text)).toBeFalse();
    }
    expect(fixture.nativeElement.querySelector('#text-error')?.textContent).toContain('Insira algum texto');
  });

  it('should start reading with text and reset on quit', () => {
    submit('um texto');
    expect(app.isReaderMode).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-reader')).toBeTruthy();

    app.handleQuitReading();
    expect(app.isReaderMode).toBeFalse();
    expect(app.form.value.text).toBeNull();
  });
});
