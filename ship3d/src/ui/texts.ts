// Every text of the page, in English and Brazilian Portuguese.
export type Lang = 'en' | 'pt';

interface Texts {
  title: string;
  unofficial: string;
  loading: string;
  noWebgl: string;
  tour: string;
  stopTour: string;
  time: string;
  timeLapse: string;
  hide: string;
  show: string;
  gps: string;
  drag: string;
  notice: string;
  shots: Record<string, [string, string]>;
}

export const TEXTS: Record<Lang, Texts> = {
  en: {
    title: 'Virtuosa 3D',
    unofficial: 'unofficial',
    loading: 'Building the ship…',
    noWebgl: 'This page needs WebGL 2, which this browser or device does not offer.',
    tour: 'Tour',
    stopTour: 'Stop tour',
    time: 'Time of day',
    timeLapse: 'Let the day run',
    hide: 'Hide controls',
    show: 'Show controls',
    gps: 'Walking GPS',
    drag: 'Drag to look around, pinch or scroll to zoom',
    notice: 'Unofficial fan project, not affiliated with MSC Cruises. Built from the open deck plans of Virtuosa GPS; details are approximate.',
    shots: {
      ship: ['The ship', '331 m long, 43 m wide, 19 decks, under way at 19 knots'],
      pool: ['Pool deck', 'Deck 15: the Atmosphere Pool, with the gallery of deck 16 above'],
      party: ['Pool party', 'Deck 15: the stage, the big screen and the dance floor'],
      aquapark: ['Aquapark', 'Deck 19: three slides, the splash pool and the ropes course'],
      balconies: ['Balconies', 'Decks 8 to 14: guests step out, watch the sea and go back in'],
      bow: ['Bow', 'The navigation bridge on deck 14 and the lounges above it'],
      stern: ['Stern', 'Deck 16: the amphitheatre and the Horizon Pool over the wake'],
      galleria: ['Galleria', 'Decks 6 and 7: the indoor promenade under its LED sky'],
      cutaway: ['Cutaway', 'The ship cut open: the Galleria and the corridors of the plans'],
      sunset: ['Sunset', 'Golden hour, as the cabin lights start to come on'],
      night: ['Night', 'The pool party after dark'],
    },
  },
  pt: {
    title: 'Virtuosa 3D',
    unofficial: 'não oficial',
    loading: 'Montando o navio…',
    noWebgl: 'Esta página precisa de WebGL 2, que este navegador ou aparelho não oferece.',
    tour: 'Passeio',
    stopTour: 'Parar passeio',
    time: 'Hora do dia',
    timeLapse: 'Deixar o dia passar',
    hide: 'Esconder controles',
    show: 'Mostrar controles',
    gps: 'GPS a pé',
    drag: 'Arraste para olhar em volta, use dois dedos ou a rolagem para aproximar',
    notice: 'Projeto de fãs, não oficial e sem vínculo com a MSC Cruzeiros. Feito a partir das plantas abertas do Virtuosa GPS; os detalhes são aproximados.',
    shots: {
      ship: ['O navio', '331 m de comprimento, 43 m de largura, 19 decks, navegando a 19 nós'],
      pool: ['Deck da piscina', 'Deck 15: a piscina Atmosphere, com a galeria do deck 16 em cima'],
      party: ['Festa na piscina', 'Deck 15: o palco, o telão e a pista de dança'],
      aquapark: ['Aquapark', 'Deck 19: três toboáguas, a piscina de chegada e o arvorismo'],
      balconies: ['Varandas', 'Decks 8 a 14: os hóspedes saem, olham o mar e voltam para a cabine'],
      bow: ['Proa', 'A ponte de comando no deck 14 e os lounges acima dela'],
      stern: ['Popa', 'Deck 16: o anfiteatro e a piscina Horizon sobre a esteira do navio'],
      galleria: ['Galleria', 'Decks 6 e 7: o calçadão coberto sob o céu de LED'],
      cutaway: ['Corte', 'O navio aberto ao meio: a Galleria e os corredores das plantas'],
      sunset: ['Pôr do sol', 'Hora dourada, quando as luzes das cabines começam a acender'],
      night: ['Noite', 'A festa na piscina depois que escurece'],
    },
  },
};
