import { afterRenderEffect, Component, ElementRef, Injectable, signal, viewChild } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Label of the button that goes ahead with the action. */
  confirmLabel: string;
  /** Label of the button that keeps things as they are (focused first, so Enter is safe). */
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red). */
  danger?: boolean;
  /** Makes staying the main action, for questions that guard against a slip (e.g. leaving a reading). */
  preferCancel?: boolean;
}

interface Request extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/** Asks for confirmation with the app's own dialog instead of window.confirm. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<Request | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.request()?.resolve(false); // a newer question replaces an unanswered one
    return new Promise(resolve => this.request.set({ ...options, resolve }));
  }

  answer(confirmed: boolean) {
    const request = this.request();
    this.request.set(null);
    request?.resolve(confirmed);
  }
}

/** Rendered once at the root; shows whatever ConfirmService is asking. */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <dialog #dialog class="modal font-sans" aria-labelledby="confirm-title" aria-describedby="confirm-message"
      (cancel)="confirm.answer(false)" (click)="onBackdrop($event)">
      <!-- Always rendered (not @if), so the safe button exists and takes focus when the dialog opens. -->
      <div class="flex flex-col gap-3 p-5">
        <h2 id="confirm-title" class="text-lg font-semibold">{{ confirm.request()?.title }}</h2>
        <p id="confirm-message" class="text-gray-700 dark:text-gray-300">{{ confirm.request()?.message }}</p>
        <div class="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" class="btn" [class]="confirm.request()?.preferCancel ? 'btn-primary' : 'btn-secondary'" autofocus (click)="confirm.answer(false)">
            {{ confirm.request()?.cancelLabel ?? 'Cancelar' }}
          </button>
          <button type="button" class="btn" [class]="confirm.request()?.danger ? 'btn-danger' : confirm.request()?.preferCancel ? 'btn-secondary' : 'btn-primary'" (click)="confirm.answer(true)">
            {{ confirm.request()?.confirmLabel }}
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor(readonly confirm: ConfirmService) {
    // After render: the new texts are in the DOM before showModal moves focus to the safe button.
    afterRenderEffect(() => {
      const request = this.confirm.request();
      const dialog = this.dialog().nativeElement;
      if (request) {
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  onBackdrop(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement) this.confirm.answer(false);
  }
}
