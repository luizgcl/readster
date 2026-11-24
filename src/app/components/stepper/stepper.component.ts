import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * "− value +" control. Shows the current value, so settings never change blindly;
 * clicking the value resets it when a default is given.
 */
@Component({
  selector: 'app-stepper',
  imports: [LucideAngularModule],
  host: { class: 'flex flex-col gap-1' },
  template: `
    <span [id]="name() + '-label'" class="text-sm font-medium">{{ label() }}</span>
    <div class="flex items-center gap-1" role="group" [attr.aria-labelledby]="name() + '-label'">
      <button type="button" class="btn btn-secondary btn-icon" [attr.aria-label]="'Diminuir ' + label().toLowerCase()"
        [disabled]="value() <= min()" (click)="set(value() - step())">
        <lucide-icon name="minus" size="18" aria-hidden="true" />
      </button>
      <button type="button" class="btn btn-ghost min-w-24 px-2 tabular-nums" [id]="name()"
        [disabled]="defaultValue() === null || value() === defaultValue()"
        [attr.aria-label]="label() + ': ' + display() + (defaultValue() !== null ? '. Clique para restaurar o padrão' : '')"
        [title]="defaultValue() !== null ? 'Restaurar padrão' : ''"
        aria-live="polite"
        (click)="set(defaultValue()!)">
        {{ display() }}
      </button>
      <button type="button" class="btn btn-secondary btn-icon" [attr.aria-label]="'Aumentar ' + label().toLowerCase()"
        [disabled]="value() >= max()" (click)="set(value() + step())">
        <lucide-icon name="plus" size="18" aria-hidden="true" />
      </button>
    </div>
  `,
  styles: `:host button[disabled].btn-ghost { opacity: 1; cursor: default; }`,
})
export class StepperComponent {
  /** Base for element ids (the value button gets this id). */
  name = input.required<string>();
  label = input.required<string>();
  value = input.required<number>();
  min = input.required<number>();
  max = input.required<number>();
  step = input(1);
  unit = input('');
  defaultValue = input<number | null>(null);
  valueChange = output<number>();

  display(): string {
    return this.unit() ? `${this.value()} ${this.unit()}` : String(this.value());
  }

  set(value: number) {
    this.valueChange.emit(Math.min(this.max(), Math.max(this.min(), value)));
  }
}
