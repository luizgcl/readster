import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ReaderComponent } from '../components/reader/reader.component';
import { ThemeToggleComponent } from '../components/theme-toggle.component';
import { ContributorsComponent, REPO_URL } from '../components/contributors.component';
import { setPageSeo, setStructuredData, SITE_DESCRIPTION, SITE_URL } from '../seo';

/** Sample for the live demo: original text, short enough to finish in a minute. */
const DEMO_TEXT = `Um texto, uma palavra de cada vez
Ler na tela cansa: o olho pula linhas, a cabeça viaja e, quando você percebe, voltou três parágrafos.
O Readster marca onde você está. Aperte o play e ele avança sozinho, no ritmo que você escolher, com uma pausa curta depois de cada vírgula e uma pausa maior no fim das frases.
Prefere uma palavra por vez, sempre no mesmo lugar? Troque a exibição nos ajustes. Dá para mudar a fonte, o tamanho, a cor do destaque e quantas palavras aparecem juntas.`;

const FAQ: { q: string; a: string }[] = [
  {
    q: 'O Readster faz eu ler mais rápido?',
    a: 'Não prometemos isso. Ele ajuda a manter o foco e um ritmo constante. A velocidade que funciona depende de você e do texto, e dá para ajustar a qualquer momento.',
  },
  {
    q: 'Preciso criar uma conta?',
    a: 'Não. Abra e use. Não há cadastro, login nem e-mail.',
  },
  {
    q: 'Meus textos vão para algum servidor?',
    a: 'Não. O texto, o progresso e os ajustes ficam guardados no seu navegador. Até o PDF é lido no seu aparelho.',
  },
  {
    q: 'Posso continuar a leitura em outro aparelho?',
    a: 'Ainda não. Como tudo fica no navegador, cada aparelho tem a sua biblioteca. Limpar os dados do navegador também apaga os textos salvos.',
  },
  {
    q: 'Funciona com qualquer PDF?',
    a: 'Com PDFs que têm texto selecionável. PDFs escaneados (só imagem) não funcionam, e layouts com muitas colunas ou tabelas podem sair fora de ordem.',
  },
  {
    q: 'Quanto custa?',
    a: 'Nada. O Readster é gratuito e de código aberto, sob a licença MIT.',
  },
];

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, LucideAngularModule, ReaderComponent, ThemeToggleComponent, ContributorsComponent],
  host: { class: 'flex flex-col flex-1' },
  template: `
    <a href="#conteudo" class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 btn btn-secondary z-10">Pular para o conteúdo</a>

    <header class="sticky top-0 z-10 bg-white/90 backdrop-blur dark:bg-gray-950/90 border-b border-gray-200 dark:border-gray-800">
      <div class="mx-auto max-w-6xl px-4 h-14 flex items-center gap-2">
        <a href="/" class="focus-ring rounded-md flex items-center gap-2 font-extrabold text-3xl tracking-tight lowercase mr-auto" aria-label="Readster: início">
          <img src="logo.svg" alt="" width="34" height="31" />
          Readster
        </a>
        <nav aria-label="Seções" class="hidden md:flex items-center">
          <a href="#demo" class="btn btn-ghost">Demonstração</a>
          <a href="#como-funciona" class="btn btn-ghost">Como funciona</a>
          <a href="#perguntas" class="btn btn-ghost">Perguntas</a>
          <a href="#codigo-aberto" class="btn btn-ghost">Código aberto</a>
        </nav>
        <a [href]="repoUrl" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-icon hidden sm:inline-flex"
          aria-label="Código do Readster no GitHub (abre em nova aba)" title="GitHub">
          <lucide-icon name="github" size="20" aria-hidden="true" />
        </a>
        <app-theme-toggle />
        <a routerLink="/app" class="btn btn-primary">Abrir o app</a>
      </div>
    </header>

    <main id="conteudo" class="flex flex-col">
      <!-- Hero -->
      <section class="mx-auto max-w-6xl w-full px-4 pt-12 pb-10 sm:pt-20 text-center flex flex-col items-center gap-5">
        <h1 class="max-w-3xl text-4xl sm:text-6xl font-extrabold tracking-tight text-balance">
          Leia no seu ritmo, <span class="text-brand-600 dark:text-brand-300">sem se perder no texto.</span>
        </h1>
        <p class="max-w-2xl text-lg sm:text-xl text-gray-700 dark:text-gray-300 text-pretty">
          Cole um texto ou abra um PDF. O Readster destaca as palavras, avança sozinho na velocidade
          que você escolher e lembra onde você parou.
        </p>
        <div class="flex flex-col sm:flex-row gap-3">
          <a routerLink="/app" class="btn btn-primary text-lg px-6">
            <lucide-icon name="play" size="20" aria-hidden="true" />
            Abrir o Readster
          </a>
          <a href="#demo" class="btn btn-secondary text-lg px-6">Ver funcionando ↓</a>
        </div>
        <ul class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-700 dark:text-gray-300" aria-label="Garantias">
          @for (item of promises; track item) {
            <li class="flex items-center gap-1.5">
              <lucide-icon name="check" size="16" class="text-brand-600 dark:text-brand-300" aria-hidden="true" />
              {{ item }}
            </li>
          }
        </ul>
      </section>

      <!-- Live demo: the real reader, loaded only when it scrolls into view -->
      <section id="demo" class="scroll-mt-16 mx-auto max-w-5xl w-full px-3 sm:px-4 pb-16" aria-labelledby="demo-title">
        <div class="text-center mb-6">
          <p class="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">Demonstração ao vivo</p>
          <h2 id="demo-title" class="text-3xl sm:text-4xl font-bold tracking-tight">Pode mexer.</h2>
          <p class="mt-2 text-gray-700 dark:text-gray-300">
            É o leitor de verdade. Aperte o play, clique numa palavra ou abra os ajustes na engrenagem.
          </p>
        </div>
        @defer (on viewport) {
          <app-reader [text]="demoText" [embedded]="true" />
        } @placeholder {
          <div class="card h-[26rem] sm:h-[28rem] w-full" aria-hidden="true"></div>
        }
      </section>

      <!-- How it works -->
      <section id="como-funciona" class="scroll-mt-16 bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800" aria-labelledby="how-title">
        <div class="mx-auto max-w-6xl px-4 py-16">
          <h2 id="how-title" class="text-3xl sm:text-4xl font-bold tracking-tight">Como funciona.</h2>
          <p class="mt-2 text-gray-700 dark:text-gray-300">Três passos, nenhum cadastro.</p>
          <ol class="mt-8 grid gap-6 md:grid-cols-3">
            @for (step of steps; track step.title; let i = $index) {
              <li class="flex flex-col gap-2">
                <span class="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 font-bold dark:bg-brand-900/40 dark:text-brand-200" aria-hidden="true">{{ i + 1 }}</span>
                <h3 class="text-lg font-semibold">{{ step.title }}</h3>
                <p class="text-gray-700 dark:text-gray-300">{{ step.text }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- Features -->
      <section class="mx-auto max-w-6xl w-full px-4 py-16" aria-labelledby="features-title">
        <h2 id="features-title" class="text-3xl sm:text-4xl font-bold tracking-tight">Feito para ler, não para distrair.</h2>
        <ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (feature of features; track feature.title) {
            <li class="card p-5 flex flex-col gap-2">
              <lucide-icon [name]="feature.icon" size="24" class="text-brand-600 dark:text-brand-300" aria-hidden="true" />
              <h3 class="font-semibold">{{ feature.title }}</h3>
              <p class="text-sm text-gray-700 dark:text-gray-300">{{ feature.text }}</p>
            </li>
          }
        </ul>
      </section>

      <!-- Privacy -->
      <section class="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800" aria-labelledby="privacy-title">
        <div class="mx-auto max-w-6xl px-4 py-16 grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 id="privacy-title" class="text-3xl sm:text-4xl font-bold tracking-tight">Fica no seu navegador.</h2>
            <p class="mt-3 text-gray-700 dark:text-gray-300">
              O Readster não tem servidor de textos. O que você cola, o PDF que você abre, onde você parou e
              os seus ajustes ficam guardados no próprio navegador, no seu aparelho.
            </p>
          </div>
          <ul class="flex flex-col gap-3">
            @for (item of privacy; track item) {
              <li class="flex gap-3">
                <lucide-icon name="shield-check" size="22" class="shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
                <span>{{ item }}</span>
              </li>
            }
          </ul>
        </div>
      </section>

      <!-- FAQ -->
      <section id="perguntas" class="scroll-mt-16 mx-auto max-w-3xl w-full px-4 py-16" aria-labelledby="faq-title">
        <h2 id="faq-title" class="text-3xl sm:text-4xl font-bold tracking-tight">Perguntas.</h2>
        <p class="mt-2 text-gray-700 dark:text-gray-300">Respostas curtas e sinceras.</p>
        <div class="mt-6 divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800">
          @for (item of faq; track item.q) {
            <details class="group">
              <summary class="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium rounded">
                {{ item.q }}
                <lucide-icon name="chevron-down" size="20" class="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p class="pb-4 text-gray-700 dark:text-gray-300">{{ item.a }}</p>
            </details>
          }
        </div>
      </section>

      <!-- Open source -->
      <section id="codigo-aberto" class="scroll-mt-16 bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800" aria-labelledby="oss-title">
        <div class="mx-auto max-w-6xl px-4 py-16 grid gap-10 md:grid-cols-2">
          <div class="flex flex-col gap-4">
            <h2 id="oss-title" class="text-3xl sm:text-4xl font-bold tracking-tight">Código aberto.</h2>
            <p class="text-gray-700 dark:text-gray-300">
              O Readster é open source, sob a licença MIT. Dá para ver como ele funciona, sugerir uma melhoria,
              relatar um problema ou mandar um pull request. Toda ajuda é bem-vinda, inclusive com textos e traduções.
            </p>
            <div class="flex flex-col sm:flex-row gap-2">
              <a [href]="repoUrl" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                <lucide-icon name="github" size="20" aria-hidden="true" />
                Ver no GitHub
              </a>
              <a [href]="repoUrl + '/issues/new'" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                <lucide-icon name="bug" size="20" aria-hidden="true" />
                Relatar um problema
              </a>
            </div>
            <a [href]="repoUrl + '#como-contribuir'" target="_blank" rel="noopener noreferrer" class="self-start underline hover:no-underline rounded focus-ring text-sm">
              Como contribuir
            </a>
          </div>
          <div class="flex flex-col gap-3">
            <h3 class="font-semibold">Quem fez o Readster</h3>
            @defer (on viewport) {
              <app-contributors />
            } @placeholder {
              <p class="text-sm text-gray-600 dark:text-gray-400">Contribuidores</p>
            }
            <p class="text-sm text-gray-600 dark:text-gray-400">
              A lista vem do GitHub e é carregada só quando você chega a esta seção.
            </p>
          </div>
        </div>
      </section>

      <!-- Final call -->
      <section class="mx-auto max-w-6xl w-full px-4 pb-20">
        <div class="rounded-2xl bg-brand-500 text-white px-6 py-12 sm:py-16 text-center flex flex-col items-center gap-4">
          <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">Tem um texto esperando?</h2>
          <p class="max-w-xl text-brand-50">Abra o Readster, cole o texto e aperte o play. Leva segundos.</p>
          <a routerLink="/app/nova" class="btn bg-white text-brand-700 hover:bg-brand-50 text-lg px-6 focus-visible:ring-white focus-visible:ring-offset-brand-500">
            Começar a ler
          </a>
        </div>
      </section>
    </main>

    <footer class="border-t border-gray-200 dark:border-gray-800">
      <div class="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row gap-2 items-center justify-between text-sm text-gray-700 dark:text-gray-300">
        <p class="flex items-center gap-2">
          <img src="logo.svg" alt="" width="20" height="18" />
          Readster · leitura no seu ritmo
        </p>
        <div class="flex items-center gap-4">
          <a [href]="repoUrl" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1 underline hover:no-underline rounded focus-ring">
            <lucide-icon name="github" size="16" aria-hidden="true" />
            GitHub
          </a>
          <a [href]="repoUrl + '/blob/main/LICENSE'" target="_blank" rel="noopener noreferrer" class="underline hover:no-underline rounded focus-ring">Licença MIT</a>
          <a routerLink="/app" class="underline hover:no-underline rounded focus-ring">Abrir o app</a>
        </div>
      </div>
    </footer>
  `,
})
export class LandingPage {
  constructor() {
    setPageSeo({ path: '/', description: SITE_DESCRIPTION, index: true });
    // Describes the app and the FAQ to search engines (rendered into the prerendered HTML).
    setStructuredData('ld-app', {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Readster',
      url: SITE_URL + '/',
      description: SITE_DESCRIPTION,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Qualquer navegador moderno',
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      image: SITE_URL + '/og-image.png',
      sameAs: [REPO_URL],
      license: 'https://opensource.org/licenses/MIT',
    });
    setStructuredData('ld-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
  }

  readonly demoText = DEMO_TEXT;
  readonly repoUrl = REPO_URL;
  readonly faq = FAQ;
  readonly promises = ['Grátis e sem cadastro', 'Seu texto não sai do navegador', 'No celular e no computador'];
  readonly steps = [
    { title: 'Cole ou abra', text: 'Cole qualquer texto ou abra um arquivo .txt ou .pdf.' },
    { title: 'Ajuste do seu jeito', text: 'Escolha a velocidade, quantas palavras aparecem juntas, a fonte e a cor do destaque.' },
    { title: 'Leia e volte depois', text: 'Aperte o play ou avance no seu tempo. O Readster guarda onde você parou.' },
  ];
  readonly features = [
    { icon: 'highlighter', title: 'Destaque que guia o olho', text: 'Uma ou mais palavras marcadas por vez, no texto completo, com a cor que você preferir.' },
    { icon: 'focus', title: 'Palavra a palavra', text: 'Um modo em que as palavras aparecem sempre no mesmo lugar, sem o olho precisar correr a linha.' },
    { icon: 'gauge', title: 'Velocidade com respiro', text: 'De 100 a 700 palavras por minuto, com pausas naturais depois de vírgulas e pontos.' },
    { icon: 'library', title: 'Biblioteca com progresso', text: 'Seus textos ficam salvos com a porcentagem lida. Continue de onde parou.' },
    { icon: 'file-text', title: 'TXT e PDF', text: 'Abra arquivos de texto e PDFs com texto selecionável, direto do seu aparelho.' },
    { icon: 'keyboard', title: 'Atalhos e tema escuro', text: 'Espaço para pausar, setas para navegar e mudar a velocidade, e tema claro ou escuro.' },
  ];
  readonly privacy = [
    'Sem conta, sem login, sem e-mail.',
    'Nenhum texto é enviado para servidores: até o PDF é lido no seu aparelho.',
    'Você apaga um texto quando quiser, e ele some de vez.',
  ];
}
