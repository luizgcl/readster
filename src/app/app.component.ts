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
      text: [`Pongo era um dálmata super legal que morava com Roger, um músico gente boa, mas um pouco avoado. Pongo cuidava de Roger como um irmão mais velho, e todo dia eles davam um rolê no parque.

Uma tarde, Pongo estava se sentindo meio pra baixo. Ele adorava Roger, mas às vezes a vida parecia um pouco parada. De repente, ele viu uma gata dálmata passeando com sua dona! Pongo soube na hora: era ela! Ele tinha que apresentar Roger àquela moça!

Pongo tentou de tudo para chamar a atenção de Roger, mas o cara estava distraído demais com suas músicas. Pongo até se jogou na coleira, arrastando Roger para perto da moça e da dálmata. Foi uma confusão! Roger e a moça caíram no chão, e a dálmata, toda elegante, só observava.

Mas no fim das contas, todo mundo riu da situação. A moça, que se chamava Anita, achou Roger engraçado, e ele achou ela linda. E assim começou uma amizade. Eles se encontravam no parque todos os dias, e Pongo finalmente podia paquerar a dálmata, Perdita.

Roger e Anita se apaixonaram e se casaram. E claro, Pongo e Perdita também ficaram juntos para sempre! Logo, Perdita estava esperando filhotinhos, e um dia, Nani, a cozinheira da casa, descobriu a maior ninhada de dálmatas que você já viu: quinze cachorrinhos!

Mas a alegria durou pouco. Uma amiga antiga de Anita, Cruella de Vil, apareceu querendo comprar todos os filhotes. Ela era obcecada por peles de animais e queria fazer um casaco com a pele dos dálmatas! Roger e Anita se recusaram, é claro, mas Cruella não desistiu fácil assim.

Alguns dias depois, dois caras estranhos apareceram na casa dizendo que eram da companhia de luz. Era mentira! Eles eram capangas de Cruella, e enquanto Nani tentava impedi-los, eles roubaram todos os filhotes!

Pongo e Perdita ficaram arrasados, mas Pongo não ia deixar barato. Ele pediu ajuda a outros cachorros, e logo a notícia do roubo se espalhou pela cidade. Um gato corajoso chamado Sargento Tibs descobriu que os filhotes estavam no esconderijo de Cruella, uma mansão assustadora.

Tibs era esperto e conseguiu entrar na mansão sem ser visto. Lá dentro, ele encontrou não só os quinze filhotes de Pongo e Perdita, mas outros 99 dálmatas que Cruella também tinha roubado!

Enquanto os capangas de Cruella assistiam a um filme de bang-bang, Tibs organizou uma fuga em massa. Os 99 filhotes escaparam da mansão e se encontraram com Pongo e Perdita, que estavam esperando do lado de fora.

Aí começou uma aventura! Os 101 dálmatas fugiram pela neve, se escondendo em uma fazenda. Mas Cruella estava na cola deles! Ela e seus capangas perseguiram os dálmatas em um caminhão, mas Pongo e Perdita foram mais espertos. Eles se disfarçaram de vira-latas, e Cruella passou direto por eles!

No final, os dálmatas conseguiram voltar para casa sãos e salvos. Roger e Anita ficaram radiantes, e Nani quase desmaiou quando viu 99 cãezinhos entrando pela porta!

Anita, com seu coração enorme, decidiu adotar todos os filhotes que não tinham família. E assim, Roger, Anita, Pongo, Perdita e os 101 dálmatas viveram felizes para sempre em uma casa cheia de amor, latidos e, claro, muitas manchas!`, Validators.required]
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
