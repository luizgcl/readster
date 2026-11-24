import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReaderComponent } from './components/reader/reader.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-root',
    imports: [ReaderComponent, ReactiveFormsModule, LucideAngularModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {

  formBuilder = inject(FormBuilder)
  form: FormGroup

  isReaderMode = false;

  constructor() {
    this.form = this.formBuilder.group({
      // pattern rejects whitespace-only text, which would open an empty reader
      text: [null, [Validators.required, Validators.pattern(/\S/)]]
    })
  }

  get showTextError(): boolean {
    const control = this.form.controls['text'];
    return control.invalid && control.touched;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isReaderMode = true;
  }

  handleQuitReading() {
    this.isReaderMode = false
    this.form.reset()
  }
}
