#!/usr/bin/env node
/**
 * Gera as imagens estáticas do site: o cartão de compartilhamento (1200x630,
 * um por idioma) e os ícones PNG do manifesto. Rode com `npm run images`
 * sempre que mudar o título ou a paleta.
 *
 * O cartão imita o próprio painel — mesmas cores validadas, mesma ideia de
 * área por peso — para quem vê o link no buscador ou numa rede reconhecer a
 * página antes de abrir.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const out = (name) => resolve(here, '../public', name);

const SURFACE = '#1a1a19';
const PLANE = '#0d0d0d';
const INK = '#ffffff';
const MUTED = '#898781';
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';

// Degraus da escala divergente no modo escuro, os mesmos do painel.
const UP = ['#184f95', '#256abf', '#3987e5'];
const DOWN = ['#8c2828', '#b43b3a', '#da5450'];

/** Blocos do mini-mapa: x, y, largura, altura (em px), cor e ticker. */
const TILES = [
  [0, 0, 300, 196, UP[2], 'ITUB4', '+1,8%'],
  [304, 0, 196, 196, UP[1], 'BBDC4', '+0,9%'],
  [504, 0, 180, 128, UP[0], 'B3SA3', ''],
  [504, 132, 180, 64, UP[1], 'BBAS3', ''],
  [688, 0, 232, 196, DOWN[2], 'VALE3', '−2,4%'],
  [924, 0, 276, 120, UP[2], 'PETR4', '+1,2%'],
  [924, 124, 276, 72, UP[1], 'PETR3', ''],
  [0, 200, 196, 120, UP[1], 'ABEV3', ''],
  [200, 200, 152, 120, DOWN[1], 'WEGE3', ''],
  [356, 200, 140, 120, UP[0], 'EQTL3', ''],
  [500, 200, 184, 120, UP[2], 'SBSP3', ''],
  [688, 200, 120, 120, DOWN[0], 'GGBR4', ''],
  [812, 200, 108, 120, UP[1], 'RENT3', ''],
  [924, 200, 276, 120, UP[0], 'AXIA3', ''],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function card({ title, tagline, footer }) {
  const tiles = TILES.map(([x, y, w, h, fill, ticker, delta]) => {
    const ink = fill === UP[2] || fill === DOWN[2] ? '#0b0b0b' : INK;
    const label = `<text x="${x + 14}" y="${y + 34}" fill="${ink}" font-family="${FONT}" font-size="24" font-weight="700">${ticker}</text>`;
    const sub = delta
      ? `<text x="${x + 14}" y="${y + 60}" fill="${ink}" font-family="${FONT}" font-size="18" opacity="0.92">${esc(delta)}</text>`
      : '';
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}"/>${label}${sub}`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PLANE}"/>
  <g transform="translate(0, 10)">${tiles}</g>
  <rect y="336" width="1200" height="294" fill="${SURFACE}"/>
  <rect y="336" width="1200" height="2" fill="#2c2c2a"/>
  <text x="56" y="446" fill="${INK}" font-family="${FONT}" font-size="64" font-weight="700" letter-spacing="-1.5">${esc(title)}</text>
  <text x="56" y="498" fill="#c3c2b7" font-family="${FONT}" font-size="28">${esc(tagline)}</text>
  <text x="56" y="560" fill="${MUTED}" font-family="${FONT}" font-size="22">${esc(footer)}</text>
</svg>`;
}

const CARDS = [
  {
    file: 'og.png',
    title: 'Mapa do Ibovespa',
    tagline: 'Área por peso no índice · cor pela variação do dia',
    footer: 'Dados públicos da B3, brapi.dev e Yahoo Finance · sem cadastro',
  },
  {
    file: 'og-en.png',
    title: 'Ibovespa Map',
    tagline: 'Area by index weight · colour by daily change',
    footer: 'Public data from B3, brapi.dev and Yahoo Finance · no sign-up',
  },
];

for (const spec of CARDS) {
  const png = await sharp(Buffer.from(card(spec))).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(out(spec.file), png);
  console.log(`gravado public/${spec.file} — ${(png.length / 1024).toFixed(0)} kB`);
}

// Ícones do manifesto, a partir do mesmo favicon.
const icon = resolve(here, '../public/favicon.svg');
for (const size of [180, 192, 512]) {
  const name = size === 180 ? 'icon-180.png' : `icon-${size}.png`;
  const png = await sharp(icon, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(out(name), png);
  console.log(`gravado public/${name}`);
}
