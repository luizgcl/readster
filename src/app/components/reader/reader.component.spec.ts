import { ComponentFixture, TestBed } from '@angular/core/testing';
import { icons, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

import { ReaderComponent } from './reader.component';

describe('ReaderComponent', () => {
  let component: ReaderComponent;
  let fixture: ComponentFixture<ReaderComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReaderComponent],
      providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReaderComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.componentRef.setInput('text', '  um  dois\ntrês   quatro cinco ');
    fixture.detectChanges();
  });

  const highlighted = () => Array.from(el.querySelectorAll('.highlight')).map(e => e.textContent);
  const button = (label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it('should split on any whitespace and ignore empty words', () => {
    expect(component.words()).toEqual(['um', 'dois', 'três', 'quatro', 'cinco']);
  });

  it('should highlight exactly one word by default', () => {
    expect(highlighted()).toEqual(['um']);
  });

  it('should move forward and backward by the same amount', () => {
    component.highlightWords = 2;
    fixture.detectChanges();
    expect(highlighted()).toEqual(['um', 'dois']);

    button('Próximas palavras').click();
    fixture.detectChanges();
    expect(highlighted()).toEqual(['três', 'quatro']);

    button('Palavras anteriores').click();
    fixture.detectChanges();
    expect(highlighted()).toEqual(['um', 'dois']);
  });

  it('should clamp at start and stop at the end', () => {
    expect(button('Palavras anteriores').disabled).toBeTrue();
    component.highlightPreviousWord();
    expect(component.highlightedIndex).toBe(0);

    for (let i = 0; i < 10; i++) component.highlightNextWord();
    fixture.detectChanges();
    expect(highlighted()).toEqual(['cinco']);
    expect(button('Próximas palavras').disabled).toBeTrue();
  });

  it('should scroll to the newly highlighted word, not the previous one', async () => {
    // autoDetect attaches the view to the app tick, like the real root component
    fixture.autoDetectChanges();
    const spy = spyOn(HTMLElement.prototype, 'scrollIntoView');
    button('Próximas palavras').click();
    await fixture.whenStable();
    expect(spy).toHaveBeenCalled();
    expect((spy.calls.mostRecent().object as HTMLElement).textContent).toBe('dois');
  });

  it('should change font size from the buttons within limits', () => {
    button('Aumentar fonte').click();
    expect(component.fontSize).toBe(24);

    for (let i = 0; i < 10; i++) component.increaseFontSize();
    fixture.detectChanges();
    expect(component.fontSize).toBe(component.maxFontSize);
    expect(button('Aumentar fonte').disabled).toBeTrue();

    button('Restaurar tamanho da fonte').click();
    expect(component.fontSize).toBe(component.defaultFontSize);

    for (let i = 0; i < 10; i++) component.decreaseFontSize();
    fixture.detectChanges();
    expect(component.fontSize).toBe(component.minFontSize);
    expect(button('Diminuir fonte').disabled).toBeTrue();
  });
});
