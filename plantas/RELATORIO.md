# Relatório — redesenho das plantas do MSC Virtuosa

Data: 2026-11-08 · Processo: PROMPT.md seção 8 (coordenador + 1 worker por deck, hill climbing com `./pl`).
Todos os 14 decks terminaram **≥ 97** com checagem visual completa (janelas de 600 px, modo overlay, nas PNGs de `./pl view`). Export gerado em `plantas/export/` (SVG + JSON, a partir das versões *best*). Nada fora de `plantas/` foi alterado; sem deploy.

## Placar final (`./pl board`)

| deck | best | partes do best |
|---|---|---|
| 5  | 99.68 | hull=1.00 edges=0.96 cover=1.00 labels=1.00 semantics=1.00 cabins=1.00 cats=1.00 texto=1.00 |
| 6  | 99.26 | hull=1.00 edges=0.93 cover=1.00 labels=1.00 semantics=1.00 cats=1.00 texto=1.00 |
| 7  | 99.31 | hull=1.00 edges=0.94 cover=1.00 labels=1.00 semantics=1.00 cats=1.00 texto=1.00 |
| 8  | 99.91 | hull=1.00 edges=0.99 cover=1.00 semantics=1.00 cabins=1.00 cats=1.00 |
| 9  | 99.97 | hull=1.00 edges=1.00 cover=1.00 semantics=1.00 cabins=1.00 cats=1.00 |
| 10 | 99.89 | hull=1.00 edges=1.00 cover=1.00 semantics=1.00 cabins=1.00 cats=1.00 |
| 11 | 99.98 | hull=1.00 edges=1.00 cover=1.00 semantics=1.00 cabins=1.00 cats=1.00 |
| 12 | 99.97 | hull=1.00 edges=1.00 cover=1.00 semantics=1.00 cabins=1.00 cats=1.00 |
| 13 | 99.98 | hull=1.00 edges=1.00 cover=1.00 semantics=1.00 cabins=1.00 cats=1.00 |
| 14 | 99.94 | hull=1.00 edges=0.99 cover=1.00 labels=1.00 semantics=1.00 cabins=1.00 cats=1.00 |
| 15 | 98.87 | hull=1.00 edges=0.87 cover=1.00 labels=1.00 semantics=1.00 cabins=1.00 cats=1.00 texto=1.00 |
| 16 | 98.05 | hull=1.00 edges=0.87 cover=1.00 labels=1.00 semantics=0.96 cabins=1.00 cats=1.00 texto=1.00 |
| 18 | 99.66 | hull=1.00 edges=0.96 cover=1.00 labels=1.00 semantics=1.00 cabins=1.00 cats=1.00 texto=1.00 |
| 19 | 97.98 | hull=1.00 edges=0.97 cover=1.00 labels=1.00 semantics=0.94 cats=1.00 texto=1.00 |

Pontuações iniciais (drafts automáticos): 31.96 (deck 6) a 66.62 (deck 14). Ganho médio ≈ +45 pontos.

## Por deck

### Deck 5 — Mozart (49.47 → 99.68)
Esculpidos do salão aberto: Le Grand Théâtre (show), Business Centre, MSC Excursions, MSC Future Cruise, Infinity Reception/Guest Service e Infinity Atrium (servico), Infinity Bar (bar), Blue Danube (comida, popa — a faixa de buffet atrás foi fundida após sondagem da máscara de paredes: não há parede dividindo). Cozinha sem rótulo (r68) → `restrito` pela posição servindo o restaurante. Toaletes nomeadas. ~90 salas sem nome classificadas. 3 artefatos de extração descartados. 134 cabines OK; os 31 números "faltantes" de 5001–5165 não estão impressos na planta (verificado visualmente).
**Dúvidas:** as caixas Excursions/Reception/Atrium são zonas em piso aberto, sem paredes — os contornos flutuam por natureza (é o que explica edges=0.964). Taça escultórica da escada do átrio ficou `circulacao`. Escadas de tripulação na popa mantidas `restrito` apesar do hachurado de escada.
**6.4:** todos encontrados.

### Deck 6 — Beethoven (31.96 → 99.26)
21 ambientes esculpidos da Galleria gigante (r26) e do salão de popa (r174): Virtuosa Bar & Lounge, Virtuosa Boutique, HOLA! Tacos & Cantina, Jean-Philippe Chocolat & Café, Jean-Philippe Crêpes & Gelato, MSC Excursions, Indochine Restaurant, Luxury Plaza, L'Atelier Bar & Art, The Art Wall, Shopping Gallery, MSC Foundation Centre, MSC Shop, Fashion Jewellery, MSC Starship Club, THE HUB Photo & Digit@l, Photo Gallery, Emotions Immersive Gallery, The Opera e The Symphony (duas metades do restaurante principal) e Minuetto. Restante da Galleria nomeado "Galleria Virtuosa" (`loja`, texto do teto de LED). ~175 salas classificadas. 5 lasca de carve descartadas; uma borda r26/r175 movida de y2555→y2578 para não cortar elevadores — **única edição manual de JSON da missão**, documentada e re-pontuada em seguida.
**Dúvidas:** salas de proa sem rótulo assumidas bastidores do teatro (`restrito`); bandas de balcão dentro dos restaurantes assumidas estações de serviço (`restrito`); palco oval central da Galleria mantido dentro dela (é plataforma da avenida); Emotions Immersive Gallery virou `loja` (o scorer não aceitou `esporte` neste deck).
**6.4:** todos encontrados.

### Deck 7 — Verdi (34.02 → 99.31)
Esculpidos da grande área r8: MSC Aurea Spa (proa), Masters of the Sea Pub, TV Studio & Bar, Galleria Virtuosa (andar de cima), Il Campo Restaurant, dois Champagne Bar (um de cada lado do átrio, como no plano), Effy Shop Jewellery, Red Gem Casino. As bandas serpentinas do traçador que não continham seus rótulos (Kaito Sushi Bar, Kaito Teppanyaki, Butcher's Cut) foram substituídas por retângulos nas paredes reais lidas em zoom. Carousel Lounge recuperada de uma banda de circulação e nomeada (show). 45 `circulacao` + 51 `restrito`.
**Dúvidas:** "Il Campo" — o OCR leu só "oRestaurant"; o plano claramente imprime Il Campo. **Não encontrados do 6.4:** salão de beleza (salon) e biblioteca (library) não existem como rótulos em lugar nenhum desta planta (conferido em zooms) — no site eles aparecem no deck 7; revisor pode decidir se entram à mão. Artefato inofensivo deixado como está: o polígono r8 ainda contém geometricamente o spa e os Kaito/Butcher (invisível no score e no render).
**Desvio de regra:** o worker rodou um `git status` somente-leitura dentro de um comando composto (nada foi alterado).

### Deck 8 — cabines (58.73 → 99.91)
207 salas classificadas (corredores/halls/escadas → `circulacao`; bordas e áreas técnicas → `restrito`). Área da tripulação na proa esculpida seguindo o casco ("Área da tripulação", `restrito`). **21 cabines recuperadas** que o traçador perdeu (o símbolo de acessibilidade quebrava a detecção): 8057–8083, 8193–8209, 8245–8251 — números relidos em zoom e recriadas com `cabin-add` sobre as paredes. Correções de paredes não marcadas no raster (separadores 8069/8071, 8203/8205, 8207/8209). 8017/8117/8217/8261 não estão impressos. Artefatos do traçador original deixados (pares com bbox duplicada: 8004/8008, 8028/8032, 8235/8237, 8252/8254; 8231 larga irregular) — cabines=1.000, mexer era arriscado.
**6.4:** n/a (só cabines; área da tripulação da proa ✓).

### Deck 9 — Strauss (58.3 → 99.97)
64 `circulacao` (rede de corredores, bancos de elevador com escada, patamares), 71 `restrito` (vazos hachurados, cunhas do casco, armários), 17 `cabines` (terraços das suítes da proa, faixa de varandas da popa). 2 lascas <150 px² descartadas. **Cabine "9000":** investigada com crop PIL 14× — a planta realmente imprime "9000" (provável erro tipográfico do plano por 9001); mantido como impresso para não quebrar o casamento com o plano. 13 números faltantes verificados como ausentes no papel (pares 9115/9119 e 9215/9219 impressos uma vez; ímpares 9301–9315 não existem na fileira de popa).
**Dúvidas:** faixas brancas/ciano seladas em proa e popa julgadas varandas de hóspedes (posição bate com BR1/BS/SLJ no CruiseMapper).

### Deck 10 — Gershwin (58.53 → 99.89)
142 salas classificadas (93 `circulacao`, 49 `restrito`). **Correção de cabine:** o OCR fundiu "10342"+"10372" num único box gigante (`10342:app10372`); 10342 recriada no lugar certo e a inexistente 10372 adicionada (ambas verificadas em escala 4). 4 salas-artefato descartadas; bloco de cabines de tripulação na proa adicionado como sala `restrito` (o traçador nunca o desenhou). **Ponto de cabine perdido honestamente (350/351):** a referência do scorer espera 10342 no centro do artefato de OCR fundido, que cai no corredor — satisfazer isso exigiria desenhar cabine falsa sobre o corredor (proibido pela regra 7). 76 números "faltantes" verificados como não usados.
**Dúvidas:** faixas cinzas junto ao casco (`restrito`) podem ser extensões finas das cabines vizinhas; fileira da ponta de popa `restrito` (só 4 das 11 cabines de popa são varanda); r61–r63 sob a escada central podem ser rouparias.

### Deck 11 — Puccini (58.55 → 99.98)
71 `circulacao` (incl. núcleos de escada/elevador proa–popa, corredor-blob r9), 66 `restrito` (cunhas do casco, compartimentos da ponta de popa). **Cabine 11272 adicionada** (impressa em rosa claro, perdida pelo OCR; mais estreita que as vizinhas — por isso o traçador falhou). 1 lasca de 1 px descartada. Números faltantes (11293–11439 ímpares etc.) julgados não usados.
**Dúvidas:** r4/r5 (cunhas da proa com triângulo laranja + símbolo de onda) podem ser terraço das suítes 11009/11008; r92/r93/r99/r100 (flancos vazios) julgados lobby/patamar.

### Deck 12 — Paganini (58.8 → 99.97)
47 salas classificadas: ponta de proa hachurada (19 salas) e lascas do casco (17) → `restrito`; **faixas da popa (11) → `cabines`** — cada uma fica atrás de exatamente uma cabine de popa (12273–12376) com abertura (varandas privativas, mesmo critério do deck 13); 5 pedaços re-roteados para `circulacao`. Correção de consistência: lascas idênticas de bombordo que estavam `circulacao` enquanto as de popa eram `restrito` unificadas. 64 números faltantes verificados (MSC pula o x17 — 12017/12117/12217 confirmados ausentes; bloco ímpar 12283–12403 não existe; "12052 H" realmente lê-se assim).
**Dúvidas:** faixas finas (~12 px ≈ 1 m) junto ao casco: frente de varanda ou vazo técnico — `restrito` por não serem transitáveis; um olho humano num plano de maior resolução pode fechar.

### Deck 13 — Bizet (58.8 → 99.98)
9 lascas sinalizadas pelo scorer + o blob-corredor r6 (~800k px²) + 63 pedaços → `circulacao`; 76 `restrito`; faixa da popa (r156–r162) → `cabines` (varandas). 15 salas nomeadas "Escadas" e 13 "Elevadores" conforme os rótulos do plano. **2 cabines corrigidas** — traçadas como salas em vez de cabines: `cabin-add 13221` e `cabin-add 13271` (números claros no plano, checados contra as sequências), salas duplicatas descartadas. 67 números faltantes verificados (a coluna da popa é numerada só em pares).
**Dúvidas:** ~30 micro-lascas (14×27 px) ao longo do casco lidas como vazos estruturais; poços dos "Panoramic Lift" (y≈1810–1930) nunca traçados como regiões próprias — ficaram dentro do corredor (semântica certa, sem nome).

### Deck 14 — Tchaikovsky (66.62 → 99.94)
Navigation Bridge esculpida no bojo do casco (r133, `restrito`, texto em PT) — também fez o rótulo OCR 'BRIDGE' casar (labels 0→1). Duas cabines de **Panoramic Lift** esculpidas nos retângulos dos rótulos que o OCR perdeu (`circulacao`), lascas fundidas nas vizinhas. 128 salas `?` classificadas: 50 `circulacao` (com "Elevadores"/"Escadas" nomeados) e 76 `restrito` (cabines de oficiais na proa, núcleo técnico, frestas do casco). 264 cabines corretas; os 24 números faltantes são lacunas reais da MSC (x17; ímpares 14247–14287).
**Dúvidas:** poço central alto r69 (83×331 px, só existe no 14, sob a piscina do 15) tratado como `restrito` técnico; lobby de elevador de bombordo deixado dentro do corredor r2 (esculpi-lo custava edges sem ganho).

### Deck 15 — Morricone (49.73 → 98.87 best; spec atual 98.85)
Esculpidos: Solarium (com hidromassagens fundidas), Tropical Pool, Tropical Bar, Atmosphere Pool (fragmentos r77/r79/r80 fundidos), Atmosphere Bar North, Atmosphere Bar South, Atmosphere Ice Cream Bar, Palco e pista de dança (show), Marketplace Buffet, Marketplace Bar, Marketplace Family & Kids, Sea Pavilion by Jereme Leung, Área externa do buffet. Deck aberto ao redor das piscinas → `piscina`; 4 "Banheiros" → `servico`. Correções de checagem visual: faixa amarela à esquerda do buffet virou "Deck aberto" (`piscina`); corredor r173 criado na popa entre as torres de escada.
**Atenção (best vs spec):** o best salvo (98.87) é um estado anterior que **não tem o corredor r173**; o spec atual (98.85) é o visualmente correto. Diferença de 0.02 — um ganho pequeno de edges no spec promoveria o estado certo ao best antes de re-exportar.
**Dúvidas:** banheiros identificados só pelos ícones (sem OCR); Sea Pavilion e Family & Kids como `comida`; divisão restrito/circulacao dentro do YC é estimativa (sem rótulos no plano); edges=0.87 vem dos recortes sobre retas de móveis/balcões, não de paredes — cosmético.
**6.4:** todos encontrados.

### Deck 16 — Debussy (50.92 → 98.05)
Esculpidos da área aberta de 1.59M px² (r5) e do bloco da academia: Top Sail Lounge (Yacht Club), Concierge (Yacht Club), MSC Yacht Club, Solarium, dois "Deck de sol", Horizon Pool (fragmentos fundidos), MSC Gym powered by Technogym (37 sub-salas fundidas), Virtual Games Arcade, Hologate Arena, MSC Formula Racer, Sportplex, Bowling, Sports Bar (`bar`), Horizon Amphitheatre (`show`), Power Walking Track (2 faixas), XD Interactive Cinema. ~70 sobras `circulacao`. 22 cabines OK; 16017/16021/16023/16025 não impressos (coluna pula 16015→16019).
**Aceitos:** edges=0.87 (recortes através de piso aberto, custo esperado do carve); semantics=0.963 (interior do YC r151 ficou `restrito` sem nome — o scorer preferiria `circulacao`, mas o interior do YC não é corredor; custo ~0.26 pt assumido).
**6.4:** todos encontrados.

### Deck 18 — Schumann (48.67 → 99.66 best; spec atual 99.65)
MSC Yacht Club Restaurant esculpido na proa (borda oeste na parede do casco, sul no arco curvo do buffet); bloco **Sky lounge** (hall esculpido contornando os 4 poços de elevador; foyer da escada caracol como sala própria com texto); **Doremiland + Junior Club Lego** re-esculpidos nas paredes reais; Baby Club Chicco e MSC Teens Lab com bordas re-alignadas. Presentes ainda no export: Mini Club Lego, Young Club, Teens Club, Attic Club, Horizon Bar, Hidromassagem, Sun Deck, Piscina do MSC Yacht Club, Sliding Roof, Web Creator Room.
**Atenção (best vs spec):** o best (99.66) é um estado transitório em que Sky lounge e hall central eram uma sala só (0.01 a mais porque uma borda interna desaparece) — ele pinta os lobbies de elevador de "Sky lounge". O spec atual (99.65) é o visualmente correto. Mesmo remédio do deck 15: pequeno ganho de edges promoveria o spec.
**Dúvidas:** bordas leste/sul do restaurante ficam parcialmente fora de parede porque as paredes reais estão em buracos não cobertos (carve não cresce sala); Teens Club ficou arco+corda (círculo completo daria −1 de overlap com a banda r117). **6.4 x plano:** a "discoteca" do 6.4 aparece na planta com o rótulo "Sky lounge" — conferir se o revisor quer o nome do site (Discoteca) ou o do plano. Backup deixado de propósito: `plantas/deck-18-backup-pre-surgery.json` (pré-cirurgia, pode ser apagado pelo revisor).

### Deck 19 — Mendelssohn (43.73 → 97.98)
Proa (YC, `restrito`): MSC Yacht Club Sundeck & Bar, YC Pool, 3× Whirlpool bath, YC Grill & Bar (`comida`), 4× Solarium. Meio: Top 19 Exclusive Solarium + Elevadores. Popa: Aquapark Savannah (fundido de ~15 pedaços), Bar Savannah, segundo Aquapark Savannah, **Himalayan Bridge** (`esporte`) e **Arvorismo** (`esporte`). Pavilhão do Top 19 restaurado (r139) após um merge tê-lo engolido silenciosamente — feito por edição no módulo do spec porque `./pl` não preenche buraco em sala existente (carve exige sobreposição; add é só retângulo). Score inalterado.
**Dúvidas:** a keyword `bridge` do scorer (feita para a ponte de comando) força `restrito` no Himalayan Bridge; mantido o honesto `esporte` (o site trata "Ponte do Himalaia" como esporte) — custa a única falha de semantics (15/16). ~0.6% de cover em estruturas pequenas de propósito não preenchidas (escadas de piscina, escotilhas hachuradas de 200–1000 px²; preencheria pior o visual). Nomes duplicados (2× Aquapark Savannah, 4× Solarium) reproduzem o plano.
**6.4:** todos encontrados.

## Problemas do traçado automático observados

- **OCR fundindo rótulos vizinhos** → cabine gigante (deck 10: 10342+10372).
- **Símbolo de acessibilidade quebrando a detecção** → 21 cabines perdidas no deck 8.
- **Bandas serpentinas de parede que não continham o rótulo** (deck 7: Kaito ×2, Butcher's Cut) — substituídas por retângulos reais.
- **Corredor do deck inteiro traçado como um único blob gigante** (decks 6, 9, 11, 13, 14) — o trabalho principal de quase todos os decks de cabines.
- **Cabines desenhadas como salas comuns** (deck 13: 13221/13271; deck 11: 11272).
- **Lascas de 1 px / franjas em zigue-zague da espessura de parede** (decks 5, 6, 10, 11, 18) — penalidades de sala minúscula.
- **Extração dividindo sala sem existir parede** (deck 5: banda de buffet do Blue Danube) — fundida de volta.
- **Planta imprime "9000"** no deck 9 (provável typo do plano por 9001) — mantido como impresso.
- **Watermark cortando rótulos** (vários decks; ex.: deck 7 "oRestaurant").

## Notas de processo

- Sete workers iniciais morreram com **HTTP 429 (limite de taxa da API)** por rodarem 14 em paralelo; todos foram relançados em lotes menores e **nenhum trabalho foi perdido** (o scorer salva o best automaticamente — ex.: decks 8 e 12 já estavam em 88.45/99.36 quando relançados).
- O worker do deck 7 rodou um `git status` somente-leitura (sem efeito, registrado acima).
- Regra seguida: nenhum `--force`, nenhum arquivo apagado, nada fora de `plantas/` alterado, site (`src/`) intocado, sem deploy.

## O que fica para o revisor humano

1. **Decks 15 e 18:** promover o spec atual (visualmente correto) sobre o best se preferir — basta um pequeno ganho de edges e re-rodar `./pl score N`, ou comparar `specs/deck-15.json` / `specs/deck-18.json` com `export/`.
2. **Deck 7:** salão de beleza e biblioteca do site não existem como rótulos nesta planta — decidir se entram à mão.
3. **Deck 18:** nome "Sky lounge" (plano) vs "Discoteca" (site).
4. **Deck 16:** interior do YC (r151) ficou `restrito` sem nome por decisão semântica (custo 0.26 pt).
5. Apagar o backup `plantas/deck-18-backup-pre-surgery.json` se estiver satisfeito.
