// Checks that every Portuguese name and description in the deck plans has an English version
// in src/gps/i18n/places.en.json. Run after regenerating the plans (`cd plantas && ./pl export`).
import { readFileSync, readdirSync } from 'node:fs';

const mapa = JSON.parse(readFileSync('src/gps/i18n/places.en.json', 'utf8'));
const dados = JSON.parse(readFileSync('public/plantas/rotas.json', 'utf8'));
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const textos = new Set();
for (const l of dados.lugares) textos.add(l.n).add(l.t);
for (const f of readdirSync('public/plantas').filter((f) => f.endsWith('.svg'))) {
  const svg = readFileSync(`public/plantas/${f}`, 'utf8');
  for (const m of svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) textos.add(unescape(m[1]));
  for (const m of svg.matchAll(/data-[nt]="([^"]*)"/g)) textos.add(unescape(m[1]));
}

// Heuristic: accents or common Portuguese words mean the text needs a translation.
const pt = /[ãõçáéíóúâêôà]|\b(de|do|da|dos|das|com|para|na|no|em|e|ao|à)\b/i;
// Proper names with accents ("Le Grand Théâtre") are listed mapping to themselves.
const faltam = [...textos].filter((t) => t && pt.test(t) && !mapa[t]);
const sobram = Object.keys(mapa).filter((k) => !textos.has(k));

if (sobram.length) console.log(`Unused translations (safe to delete):\n  ${sobram.join('\n  ')}`);
if (faltam.length) {
  console.error(`Missing English translations in src/gps/i18n/places.en.json:\n  ${faltam.join('\n  ')}`);
  process.exit(1);
}
console.log(`i18n ok: ${textos.size} plan texts, ${Object.keys(mapa).length} translations.`);
