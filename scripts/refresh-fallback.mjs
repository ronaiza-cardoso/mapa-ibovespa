#!/usr/bin/env node
/**
 * Regrava src/data/fallback.json — o retrato local de contingência usado quando
 * a B3 ou a brapi estão fora do ar. Rode com `npm run snapshot` de vez em quando.
 * Só consulta dados públicos, sem token.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../src/data/fallback.json');
const UA = { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; painel-ibov/1.0)' };

const parseBR = (v) =>
  typeof v === 'number' ? v : Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;


const params = { language: 'pt-br', pageNumber: 1, pageSize: 300, index: 'IBOV', segment: '1' };
const b3url =
  'https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/' +
  Buffer.from(JSON.stringify(params)).toString('base64');

const [b3, list] = await Promise.all([
  fetch(b3url, { headers: UA }).then((r) => r.json()),
  fetch('https://brapi.dev/api/quote/list?limit=1000', { headers: UA }).then((r) => r.json()),
]);

if (!b3?.results?.length) throw new Error('B3 não devolveu a carteira');
if (!list?.stocks?.length) throw new Error('brapi não devolveu cotações');

const quotes = new Map(list.stocks.map((s) => [String(s.stock).toUpperCase(), s]));
const [d, m, y] = String(b3.header?.date ?? '').split('/');
const portfolioDate = d ? `${y.length === 2 ? '20' + y : y}-${m}-${d}` : new Date().toISOString().slice(0, 10);

const stocks = b3.results
  .map((r) => {
    const ticker = String(r.cod).trim().toUpperCase();
    const q = quotes.get(ticker) ?? {};
    return {
      ticker,
      asset: String(r.asset ?? '').trim(),
      type: String(r.type ?? '').replace(/\s+/g, ' ').trim(),
      weight: parseBR(r.part),
      theoreticalQty: parseBR(r.theoricalQty),
      name: q.name ?? String(r.asset ?? '').trim(),
      sector: q.sector ?? null, // chave crua da brapi; a tradução é na exibição
      subsector: q.subsector ?? '',
      price: typeof q.close === 'number' ? q.close : null,
      changePct: typeof q.change === 'number' ? q.change : null,
      marketCap: typeof q.market_cap === 'number' ? q.market_cap : null,
      volume: typeof q.volume === 'number' ? q.volume : null,
      logo: q.logo ?? null,
    };
  })
  .sort((a, b) => b.weight - a.weight);

writeFileSync(
  out,
  JSON.stringify({ portfolioDate, fetchedAt: new Date().toISOString(), stocks }, null, 1) + '\n'
);
console.log(`gravado ${out} — ${stocks.length} ativos, carteira de ${portfolioDate}`);
