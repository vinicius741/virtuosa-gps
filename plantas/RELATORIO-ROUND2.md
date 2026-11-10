# Relatório — Round 2 do redesenho das plantas (MSC Virtuosa)

Coordenador do round 2, seguindo `PROMPT-ROUND2.md` (papéis da §4, protocolo de auditoria da §5,
regras do scorer da §6, checagem final da §9). Todo trabalho de edição foi feito por sub-agentes
(workers corrigem decks; um agente "scorer maintainer" é o único que mexe em `tools/`); o
coordenador orquestra, promove, exporta, confere visualmente e escreve este relatório.

**Resultado em uma linha:** os 14 decks passaram na última auditoria independente (Verdict: PASS,
auditor diferente de quem editou), o placar final tem todos os decks ≥ 97 exceto o deck 19 (96.68,
com promoção que documenta o porquê honesto), e as especificações atuais são idênticas às `best`.

## Checklist final da §9

| # | Item | Status |
|---|---|---|
| 1 | Board ≥ 97 (ou promoção explicando) | ✅ todos ≥ 97, exceto 19 = 96.68 com promoção documentada |
| 2 | `audits/deck-N.md` com PASS de agente que não editou o deck | ✅ 14/14 (últimos rounds: 5→r4, 6→r1, 7→r1, 8→r3, 9→r4, 10→r2, 11→r2, 12→r3, 13→r3, 14→r2, 15→r3, 16→r2, 18→r2, 19→r2) |
| 3 | Specs e best idênticos nos 14 | ✅ `./pl board`: current == best em todos |
| 4 | `./pl export` + conferência visual própria (≥3 janelas × 7 decks públicos) | ✅ 21 janelas (proa/meio/ré de 5, 6, 7, 15, 16, 18, 19) vistas e conferidas |
| 5 | `py_compile tools/*.py` + `SCORER_CHANGES.md` completo | ✅ compila OK; 9 mudanças documentadas + errata da mudança 2 |
| 6 | `git status --short` na raiz = só `?? plantas/` | ✅ |
| 7 | Este relatório | ✅ |

## Placar (antes → depois)

"Antes" = placar final do round 1 (publicado em `RELATORIO.md`, já com as duas promoções do
relatório do round 1: deck 15 98.87→96.13 e deck 18 99.66→95.70, que rebaixaram o best desses
decks para refletir specs visualmente melhores). "Depois" = placar final do round 2, agora.
Os deltas não são uma métrica de "melhorou/piorou": o round 2 também **rescorou todos os bests**
com o scorer corrigido (sessão da §6), o que derrubou honestamente placares inflados (decks 9, 12,
14) — ver `SCORER_CHANGES.md` para a tabela antes→depois dessa sessão. O objetivo do round 2 era
fidelidade factual + auditoria PASS, não maximizar nota.

| deck | antes (r1) | depois (r2) | observação |
|---|---|---|---|
| 5  | 99.68 | 99.65 | custa edges honesto (zonas de serviço sem paredes) |
| 6  | 99.26 | 99.04 | correções factuais; edges 0.91 por zonas abertas |
| 7  | 99.31 | 99.25 | spa/proa e Carousel corrigidos; edges honesto |
| 8  | 99.91 | 99.74 | cabines duplicadas divididas; scorer punia paredes fora do cache |
| 9  | 99.97 | 99.97 | lascas corrigidas; nota restaurada após fix |
| 10 | 99.89 | 99.89 | sem mudança de nota; PASS em auditoria |
| 11 | 99.98 | 99.97 | slivers de área zero removidos (−0.01 de edges) |
| 12 | 99.97 | 99.97 | slivers corrigidos; nota restaurada após fix |
| 13 | 99.98 | 99.97 | torres de escada fundidas (−0.01 de edges) |
| 14 | 99.94 | 99.92 | pares de cabines divididos em paredes medidas |
| 15 | 96.13 | 99.29 | maior ganho do round (+3.16): piscinas, hidros, bares |
| 16 | 98.05 | 98.34 | academia em S, escadas; envelope YC custa semantics 0.96 |
| 18 | 95.70 | 99.56 | maior correção absoluta (+3.86): elevadores, paredes reais |
| 19 | 97.98 | 96.68 | promoção documenta o gap honesto (ver abaixo) |

## Por deck

**Deck 5 — Mozart** (auditoria r4, PASS). Nome fantasma "Map" (OCR do watermark) removido,
lascas de fileiras de assentos no teatro fundidas, átrio solidificado. Minor aceito: contornos de
Excursions/Reception/Atrium flutuam porque a própria planta não tem paredes ali (edges 0.96).
*Nota de transparência:* uma correção de texto do r104 foi aplicada diretamente pelo coordenador
no fim do round 1, antes da regra "coordenador não edita" ficar clara; desde então, nenhuma edição
direta — tudo via workers.

**Deck 6 — Schubert** (auditoria r1, PASS). Minuetto reclassificado como restaurante (comida),
corredores dos restaurantes como circulacao, escadas nomeadas, arquibancada completa do teatro.
Edges 0.91: grandes zonas abertas da Galleria sem paredes na planta.

**Deck 7 — Haydn** (auditoria r1, PASS). Spa não cobre mais a ponta da proa (r194 restrito),
Carousel Lounge fundida em uma sala, Il Campo e Galleria seguem a balaustrada real, escadarias
reclassificadas. **Dúvida em aberto para o humano:** o salão/biblioteca que o site menciona não
estão impressos nesta planta — não foram inventados (regra da §1).

**Deck 8 — Salieri** (auditoria r3, PASS). Todos os 9 pares de cabines de célula dupla vazados
foram divididos em divisórias medidas pixel a pixel (8004/8008, 8028/8032, 8070/8072, 8134/8138,
8137/8141, 8159/8163, 8162/8166, 8235/8237, 8252/8254), 8231 estreitada para a célula real (o
centroide do cache estava fundido com o watermark), 8208/8210 divididas, sala de ruído do
watermark removida. O custo 0.17 em edges é o cache de linhas obsoleto punindo paredes reais que
ele não enxerga. Minor aceito duas vezes: lixo de OCR "eMa" no r1.

**Deck 9 — Strauß I** (auditoria r4, PASS). Lascas (slivers) r24 removidas — achado pelo novo
check do scorer. Cabine 9000 confirmada real (conf 0.998) e o intervalo do scorer ajustado.

**Deck 10 — Bergen** (auditoria r2, PASS). Sem mudança de nota; auditoria confirmou o estado.

**Deck 11** (auditoria r2, PASS). Lixo de OCR "dde" removido, os dois saguões dos Panoramic
Lift esculpidos como retângulos limpos (r145/r146), três slivers de área ~zero descartados
(−0.01 de edges: as slivers encostavam em paredes reais e inflavam a contagem).

**Deck 12** (auditoria r3, PASS). Slivers r46/r85 removidas — achado pelo novo check do scorer;
nota restaurada a 99.97 após o fix.

**Deck 13** (auditoria r3, PASS). Nomes-lixo "app" e "Escadas" duplicado limpos (compartimentos
são restrito na planta), torres de escada da popa fundidas em uma sala por torre (a união r105 e a
ponte r104+r114 — o `merge` tinha descartado r114 silenciosamente num empate de buffer de 5px;
contornado com script /tmp usando as próprias funções de `tools/spec.py`, sem tocar em tools/).
Duplex 12001–12008 da proa confirmados na planta e no scorer (RANGES multi-faixa).

**Deck 14** (auditoria r2, PASS). Dois pares de cabines dividiam o mesmo polígono (14097+14101,
14102+14106) — o novo check de duplicatas do scorer derrubou o best 99.94→97.94 e o worker dividiu
nas paredes reais y1631–1632 e y1690–1691 (medidas pixel a pixel; a errata da mudança 2 do
`SCORER_CHANGES.md` registra as coordenadas corretas).

**Deck 15** (auditoria r3, PASS). Duas rodadas: (1) majors do round 1 (sliver r159; Marketplace
Buffet r169 até as duas bordas do casco) + água real esculpida nos Tropical/Atmosphere Pools
(r177/r180) com "Deck de sol" ao redor, 6 bacias de hidromassagem, escadas esculpidas como
circulacao; (2) Atmosphere Bar South redesenhado como anel limpo (r162), Marketplace Bar na parede
real y2583, vasos do r108 visíveis, blocos de escada r54/r55 completos, Solarium na parede y1083.
Menor aceito: a planta imprime "Deck de sol" várias vezes — todos mantidos.

**Deck 16** (auditoria r2, PASS). Parede curva em S real da academia, elevadores/escadas
esculpidos, deck de sol e salas nas paredes reais. Semantics 0.96 permanente: o envelope aberto do
Yacht Club (r151) não tem paredes na planta.

**Deck 18** (auditoria r2, PASS). Parede do r170 seguindo o arco real com faixa r187 como
circulacao, poços de elevador esculpidos do r160 (r188–r191), r89 estendido sobre a escada real,
fusão r33→r27, salas reclassificadas circulacao, texto no singular. **Dúvidas em aberto:** (a) a
posição do Doremiland (r175) é o piso aberto entre a parede de pilares x≈266 e x≈410 — é onde a
planta não desenha nada; confirmar com mapa de bordo; (b) os saguões dos elevadores mantêm o nome
impresso "Sky lounge", mas o site chama o espaço de Discoteca — o texto cobre a diferença.

**Deck 19 — Top 19** (auditoria r2, PASS + promoção documentando o gap). Hidromassagem r135
redesenhada para a oval real (era 4× maior e engolia a escada), Savannah Aquapark impresso uma vez
só, Solarium uma vez por borda, balcões r143–r145 como restrito, escada r9 com oval+leque reais,
plataforma da popa espelhada (r146/r147 circulacao, r148 Arvorismo). A nota caiu 99.48→96.68 de
forma **honesta**: o t5 de labels e a semântica punem geometria fiel onde a própria planta
imprime "Whirlpool bath" apontando para um piso aberto sem bacia (erro de impressão da planta) e
não imprime nomes que existem (Arvorismo vem do texto do site). Preferimos fidelidade à nota.

## Mudanças no scorer (`tools/`)

Todas feitas pelo agente **scorer maintainer**, entre ondas, com backup por arquivo
(`tools/*.py.bak-round2-*`), `py_compile` após cada mudança, teste no deck que gerou a evidência,
`rescore-best all` no fim e varredura de efeitos colaterais nos 14 decks. Detalhes completos,
tabela antes→depois da sessão e lista do que **não** foi implementado (e por quê) em
[SCORER_CHANGES.md](SCORER_CHANGES.md). Resumo das 9 mudanças:

1. RANGES multi-faixa por deck (duplex 12001–12008 do deck 13; deck 9 começa em 9000);
2. check de cabines duplicadas (>50% do polígono compartilhado) — pegou o par real do deck 14;
3. check de cabine oversized (>1.6× a célula do cache);
4. check de slivers degenerados (`verts≥200 e área≤2000`) — pegou r24 do deck 9 e r46/r85 do deck 12;
5. guarda GeometryCollection no `to_coords` (buracos não são mais descartados silenciosamente);
6. render: rótulos truncados em 40 chars (antes 28);
7. dica de lift: nomes mal-contornados de salas circulacao a até 40px;
8. lifts panorâmicos incluídos no check de lift (tolerância 6px, exceção do Atrium);
9. check de nomes-lixo em decks sem rótulos.

Errata: a coordenada citada na mudança 2 (divisórias y≈1620/1669) eram linhas de texto; as
paredes reais são y1631–1632 e y1690–1691 — corrigido no próprio SCORER_CHANGES.md.
Nada foi implementado que baixe pesos, apague checks ou trate deck por número fora da exceção
explícita do RANGES.

## Promoções do round 2 (`best/promotions.log`)

14 promoções com motivo documentado (linhas 3–16 do log). Destaques: deck 19 (99.48→96.68, gap
honesto acima), deck 8 (99.91→99.74, células de cabine reais contra cache obsoleto), deck 15
(duas rodadas, 99.3→99.29), decks 13/11 (99.98→99.97, uniões de torres/slivers mandadas pela
auditoria). As duas primeiras linhas do log são as promoções do relatório do round 1.

## Dúvidas em aberto para o humano

1. **Deck 7:** salão/biblioteca citados pelo site não estão impressos na planta — deixamos de
   inventar. Se você confirmar em um mapa de bordo, abrimos um round pontual.
2. **Deck 18:** posição do Doremiland (piso aberto entre pilares) e o nome "Sky lounge" vs
   "Discoteca" do site.
3. **Deck 19:** a planta imprime "Whirlpool bath" sem bacia ali (erro de impressão) e não imprime
   "Arvorismo" (nome vem do site) — mantemos fiel à planta; a nota paga o gap.
4. **Deck 8:** lixo de OCR "eMa" no r1 permanece (aceito como minor em duas auditorias).
5. **Limitações de ferramenta conhecidas** (documentadas, não corrigidas neste round): o cache de
   linhas é obsoleto e puni paredes que ele não enxerga (deck 8, −0.06/−0.17 de edges); o `merge`
   pode descartar salas em empates de buffer (contornado uma vez; o `to_coords` agora protege
   buracos); o `ref.py` gera falsos positivos de watermark (8231, 10342, hint do 9000) e não vê as
   cabines reais 10372/11272.
