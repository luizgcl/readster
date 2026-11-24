import { Component, input, output } from '@angular/core';

export interface SegmentOption<T> {
  value: T;
  label: string;
}

/** A few mutually exclusive options shown side by side: native radios, so arrows and screen readers just work. */
@Component({
  selector: 'app-segmented',
  host: { class: 'flex flex-col gap-1' },
  template: `
    <span [id]="name() + '-label'" class="text-sm font-medium">{{ label() }}</span>
    <div class="flex rounded-md border border-gray-300 dark:border-gray-600 p-0.5 gap-0.5" role="radiogroup" [attr.aria-labelledby]="name() + '-label'">
      @for (option of options(); track option.value) {
        <label class="flex-1 cursor-pointer">
          <input type="radio" class="peer sr-only" [name]="name()" [checked]="option.value === value()"
            (change)="valueChange.emit(option.value)" />
          <span class="flex min-h-10 items-center justify-center rounded px-2 text-sm text-center transition-colors
            hover:bg-gray-100 dark:hover:bg-gray-800
            peer-checked:bg-brand-500 peer-checked:text-white peer-checked:hover:bg-brand-500
            peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600 dark:peer-focus-visible:ring-brand-300">
            {{ option.label }}
          </span>
        </label>
      }
    </div>
  `,
})
export class SegmentedComponent<T> {
  name = input.required<string>();
  label = input.required<string>();
  options = input.required<SegmentOption<T>[]>();
  value = input.required<T>();
  valueChange = output<T>();
}
