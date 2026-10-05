import { cached, getJSON } from './cache';

/**
 * Cotações pela brapi (API pública de dados da B3).
 * A /quote/list devolve o mercado inteiro numa chamada e sem token — é dela que
 * o mapa vive. O /quote/{ticker} passou a exigir token (responde 401), então o
 * histórico e o detalhe vêm do Yahoo Finance (src/lib/yahoo.ts).
 */
const BASE = 'https://brapi.dev/api';
export const BRAPI_PAGE = 'https://brapi.dev';

export interface ListQuote {
  ticker: string;
  name: string | null;
  price: number | null;
  changePct: number | null;
  volume: number | null;
  marketCap: number | null;
  sector: string | null;
  subsector: string | null;
  logo: string | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function fetchMarketList(): Promise<Map<string, ListQuote>> {
  // 60 s: durante o pregão isso é quase tempo real sem martelar a API pública.
  return cached('brapi:list', 60_000, async () => {
    const out = new Map<string, ListQuote>();
    // A lista é paginada por `limit`; 1000 cobre todos os papéis da B3.
    const data = await getJSON(`${BASE}/quote/list?limit=1000`, 20_000);
    const rows: any[] = Array.isArray(data?.stocks) ? data.stocks : [];
    if (!rows.length) throw new Error('lista de cotações vazia');
    for (const r of rows) {
      const ticker = String(r.stock ?? '').trim().toUpperCase();
      if (!ticker) continue;
      out.set(ticker, {
        ticker,
        name: r.name ? String(r.name) : null,
        price: num(r.close),
        changePct: num(r.change), // na /quote/list, `change` já é a variação em %
        volume: num(r.volume),
        marketCap: num(r.market_cap),
        sector: r.sector ? String(r.sector) : null,
        subsector: r.subsector ? String(r.subsector) : null,
        logo: r.logo ? String(r.logo) : null,
      });
    }
    return out;
  });
}
