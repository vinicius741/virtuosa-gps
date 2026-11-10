// Texts of the public site (the GPS component has its own, in src/gps/i18n/strings.ts).
import type { Lang } from '../gps/i18n/strings';

export const REPO = 'https://github.com/vinicius741/virtuosa-gps';

export const SITE = {
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    caminho: '/',
    titulo: 'Virtuosa GPS · walking directions inside the MSC Virtuosa',
    descricao:
      'Find your way around the MSC Virtuosa cruise ship: pick where you are and where you want to go, and see the walking route, which lift to take and the deck plan for each step. Works offline. Free and open source.',
    marca: ['Virtuosa', 'GPS'],
    eyebrow: 'Works offline',
    h1: 'Ship GPS for the MSC Virtuosa',
    lead: 'Tell it where you are and where you want to go. It shows the walking route, which lift to take and the plan of every deck along the way.',
    sugestao: 'Prefere em português?',
    sugestaoLink: 'Ver o GPS em português',
    fecharSugestao: 'Close',
    sobreTitulo: 'How it works',
    sobre: [
      {
        icone: 'map',
        titulo: 'Redrawn deck plans',
        texto: 'All 14 public decks were redrawn as clean, clickable plans, with every venue, cabin, lift, stairway and door.',
      },
      {
        icone: 'route',
        titulo: 'Real walking routes',
        texto: 'Routes follow the corridors, go around stairwells and lift shafts, and enter rooms through their doors.',
      },
      {
        icone: 'wifi-off',
        titulo: 'No internet needed',
        texto: 'After the first visit everything is saved on your phone. Add it to your home screen before you board.',
      },
      {
        icone: 'star',
        titulo: 'Your family’s cabins',
        texto: 'Save cabins with names (“Mom”, “Grandma”) and send them to your family with a single link.',
      },
    ],
    abertoTitulo: 'Free and open source',
    aberto:
      'The deck plans, the route data and the code are MIT-licensed on GitHub. Found a wrong door or a missing venue? Open an issue or a pull request.',
    verGithub: 'See it on GitHub',
    aviso:
      'Unofficial project, made by passengers. Not affiliated with, endorsed by or connected to MSC Cruises. Plans and routes are approximate: always follow the signs on board and the crew’s instructions.',
    licenca: 'MIT License',
    feitoPor: 'Made for a group cruise in December 2026 and shared with everyone.',
    naoAchou: 'Page not found',
    naoAchouTexto: 'This page doesn’t exist. Go back to the ship GPS.',
    voltar: 'Open the GPS',
  },
  pt: {
    htmlLang: 'pt-BR',
    ogLocale: 'pt_BR',
    caminho: '/pt/',
    titulo: 'Virtuosa GPS · o caminho a pé dentro do MSC Virtuosa',
    descricao:
      'Ache o caminho dentro do navio MSC Virtuosa: diga onde você está e para onde quer ir e veja a rota a pé, qual elevador pegar e a planta de cada trecho. Funciona sem internet. Grátis e de código aberto.',
    marca: ['Virtuosa', 'GPS'],
    eyebrow: 'Funciona sem internet',
    h1: 'GPS do navio MSC Virtuosa',
    lead: 'Diga onde você está e para onde quer ir. O site mostra o caminho a pé, qual elevador pegar e a planta de cada deck no caminho.',
    sugestao: 'Prefer English?',
    sugestaoLink: 'Open the GPS in English',
    fecharSugestao: 'Fechar',
    sobreTitulo: 'Como funciona',
    sobre: [
      {
        icone: 'map',
        titulo: 'Plantas redesenhadas',
        texto: 'Os 14 decks dos hóspedes foram redesenhados em plantas limpas e clicáveis, com cada lugar, cabine, elevador, escada e porta.',
      },
      {
        icone: 'route',
        titulo: 'Caminhos de verdade',
        texto: 'A rota segue os corredores, contorna escadas e poços de elevador e entra nos lugares pelas portas.',
      },
      {
        icone: 'wifi-off',
        titulo: 'Sem internet',
        texto: 'Depois da primeira visita, tudo fica salvo no celular. Adicione à tela de início antes de embarcar.',
      },
      {
        icone: 'star',
        titulo: 'As cabines da família',
        texto: 'Salve as cabines com nomes (“Mãe”, “Vó”) e mande para a família por um link.',
      },
    ],
    abertoTitulo: 'Grátis e de código aberto',
    aberto:
      'As plantas, os dados das rotas e o código estão no GitHub, com licença MIT. Achou uma porta errada ou um lugar faltando? Abra uma issue ou um pull request.',
    verGithub: 'Ver no GitHub',
    aviso:
      'Projeto não oficial, feito por passageiros. Sem ligação com a MSC Cruzeiros, nem aprovação dela. Plantas e rotas são aproximadas: siga sempre as placas do navio e as orientações da tripulação.',
    licenca: 'Licença MIT',
    feitoPor: 'Feito para o cruzeiro de um grupo em dezembro de 2026 e compartilhado com todo mundo.',
    naoAchou: 'Página não encontrada',
    naoAchouTexto: 'Esta página não existe. Volte para o GPS do navio.',
    voltar: 'Abrir o GPS',
  },
} satisfies Record<Lang, unknown>;
