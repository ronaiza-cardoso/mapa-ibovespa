import { cached, getJSON } from './cache';
import type { HistoryPoint } from './types';

/**
 * Séries históricas e cotação do índice pelo endpoint público de gráfico do
 * Yahoo Finance. Não pede chave. Entrou no lugar do /quote/{ticker} da brapi,
 * que passou a responder 401 sem token — a /quote/list, que alimenta o mapa,
 * continua aberta.
 */
const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

export const YAHOO_PAGE = 'https://finance.yahoo.com';

/** Ticker da B3 no padrão do Yahoo. */
export const toSymbol = (ticker: string) => `${ticker.trim().toUpperCase()}.SA`;

export interface ChartMeta {
  longName: string | null;
  shortName: string | null;
  currency: string;
  price: number | null;
  changePct: number | null;
  previousClose: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  volume: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  updatedAt: string | null;
}

export interface Chart {
  symbol: string;
  meta: ChartMeta;
  points: HistoryPoint[];
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Uma série por (símbolo, janela). 5 min de cache: o gráfico é diário, não
 * precisa de mais frequência que isso, e segura a mão na API pública.
 */
export function fetchChart(symbol: string, range: string, interval: string): Promise<Chart> {
  return cached(`yahoo:${symbol}:${range}:${interval}`, 5 * 60_000, async () => {
    const url = `${BASE}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    const data = await getJSON(url, 20_000);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(String(data?.chart?.error?.description ?? 'série não encontrada'));

    const m = result.meta ?? {};
    const stamps: number[] = Array.isArray(result.timestamp) ? result.timestamp : [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const adj = result.indicators?.adjclose?.[0]?.adjclose;

    const points: HistoryPoint[] = [];
    for (let i = 0; i < stamps.length; i++) {
      const close = num(adj?.[i]) ?? num(quote.close?.[i]);
      if (close == null) continue; // pregão sem negócio: o Yahoo devolve null
      points.push({
        date: new Date(stamps[i]! * 1000).toISOString().slice(0, 10),
        close,
        open: num(quote.open?.[i]),
        high: num(quote.high?.[i]),
        low: num(quote.low?.[i]),
        volume: num(quote.volume?.[i]),
      });
    }

    return {
      symbol: String(m.symbol ?? symbol),
      meta: {
        longName: m.longName ? String(m.longName) : null,
        shortName: m.shortName ? String(m.shortName).replace(/\s+/g, ' ').trim() : null,
        currency: String(m.currency ?? 'BRL'),
        price: num(m.regularMarketPrice),
        changePct: num(m.regularMarketChangePercent),
        previousClose: num(m.chartPreviousClose) ?? num(m.previousClose),
        dayLow: num(m.regularMarketDayLow),
        dayHigh: num(m.regularMarketDayHigh),
        volume: num(m.regularMarketVolume),
        fiftyTwoWeekLow: num(m.fiftyTwoWeekLow),
        fiftyTwoWeekHigh: num(m.fiftyTwoWeekHigh),
        updatedAt: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null,
      },
      points,
    } satisfies Chart;
  });
}

export interface IndexQuote {
  price: number;
  changePct: number | null;
  previousClose: number | null;
  updatedAt: string | null;
}

/** Cotação do Ibovespa em pontos — a oficial, não o proxy calculado pelos pesos. */
export async function fetchIndexQuote(): Promise<IndexQuote | null> {
  try {
    const chart = await fetchChart('^BVSP', '5d', '1d');
    const price = chart.meta.price ?? chart.points.at(-1)?.close ?? null;
    if (price == null) return null;
    // Mesmo cuidado do detalhe: o fechamento anterior é o penúltimo pregão da
    // série, não o chartPreviousClose (que olha para antes da janela).
    const previousClose =
      chart.points.at(-2)?.close ??
      (chart.meta.changePct != null ? price / (1 + chart.meta.changePct / 100) : null);
    return { price, changePct: chart.meta.changePct, previousClose, updatedAt: chart.meta.updatedAt };
  } catch {
    return null;
  }
}
