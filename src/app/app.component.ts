import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ReaderComponent } from './components/reader/reader.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ReaderComponent, FormsModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  formBuilder = inject(FormBuilder)
  form: FormGroup

  isReaderMode = false;

  constructor() { 
    this.form = this.formBuilder.group({
      text: [null, Validators.required]
    })
  }

  onSubmit() {
    if (this.form.invalid) {
      return;
    }

    this.isReaderMode = true;
  }

  handleQuitReading() {
    this.isReaderMode = false
    this.form.reset()
  }
}
