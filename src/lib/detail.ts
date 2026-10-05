import { fetchChart, toSymbol } from './yahoo';
import type { HistoryPoint, ReturnKey, StockDetail } from './types';

/**
 * Detalhe de um ativo: últimas informações públicas mais o histórico.
 *
 * Uma única série diária de um ano serve a quase tudo — o gráfico de 1, 3 e 6
 * meses sai de uma fatia dela, e dela também vêm os retornos acumulados e a
 * média de volume. Só a janela de 5 anos pede uma segunda chamada, semanal.
 */
export const RANGES = ['1mo', '3mo', '6mo', '1y', '5y'] as const;
export type Range = (typeof RANGES)[number];

export function normalizeRange(value: string | null): Range {
  return (RANGES as readonly string[]).includes(value ?? '') ? (value as Range) : '3mo';
}

const DAYS: Record<Exclude<ReturnKey, 'ytd'>, number> = { '1mo': 30, '3mo': 91, '6mo': 183, '1y': 365 };

/** Primeiro fechamento a partir de uma data de corte. */
function closeFrom(points: HistoryPoint[], cutoff: string): number | null {
  for (const p of points) if (p.date >= cutoff) return p.close;
  return null;
}

function pctChange(from: number | null, to: number | null): number | null {
  if (from == null || to == null || from === 0) return null;
  return ((to - from) / from) * 100;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function buildStockDetail(tickerRaw: string, range: Range): Promise<StockDetail> {
  const ticker = tickerRaw.trim().toUpperCase();
  const empty = (detail: string): StockDetail => ({
    ticker, name: ticker, price: null, changePct: null, change: null, previousClose: null,
    open: null, dayLow: null, dayHigh: null, fiftyTwoWeekLow: null, fiftyTwoWeekHigh: null,
    rangePosition: null, volume: null, avgVolume: null, currency: 'BRL', updatedAt: null,
    range, returns: {}, history: [], ok: false, detail,
  });

  try {
    // A série de um ano é a base; o gráfico de 5 anos vem à parte, semanal.
    const base = await fetchChart(toSymbol(ticker), '1y', '1d');
    const long = range === '5y' ? await fetchChart(toSymbol(ticker), '5y', '1wk') : null;

    const windowStart =
      range === '1mo' ? isoDaysAgo(30) : range === '3mo' ? isoDaysAgo(91) : range === '6mo' ? isoDaysAgo(183) : null;
    const history = long
      ? long.points
      : windowStart
        ? base.points.filter((p) => p.date >= windowStart)
        : base.points;

    const last = base.points.at(-1) ?? null;
    const m = base.meta;
    const price = m.price ?? last?.close ?? null;

    // Atenção: chartPreviousClose é o fechamento anterior à JANELA pedida, não
    // ao pregão. O fechamento de ontem é o penúltimo ponto da série diária;
    // se faltar, deduzimos pela própria variação do dia.
    const previousClose =
      base.points.at(-2)?.close ??
      (price != null && m.changePct != null ? price / (1 + m.changePct / 100) : null);

    const returns: Partial<Record<ReturnKey, number | null>> = {};
    for (const [key, days] of Object.entries(DAYS) as [Exclude<ReturnKey, 'ytd'>, number][]) {
      returns[key] = pctChange(closeFrom(base.points, isoDaysAgo(days)), price);
    }
    returns.ytd = pctChange(closeFrom(base.points, `${new Date().getUTCFullYear()}-01-01`), price);

    const recent = base.points.slice(-30).map((p) => p.volume).filter((v): v is number => v != null);
    const avgVolume = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;

    const low = m.fiftyTwoWeekLow;
    const high = m.fiftyTwoWeekHigh;
    const rangePosition =
      price != null && low != null && high != null && high > low
        ? Math.min(1, Math.max(0, (price - low) / (high - low)))
        : null;

    return {
      ticker,
      name: m.longName ?? m.shortName ?? ticker,
      price,
      changePct: m.changePct,
      change: price != null && previousClose != null ? price - previousClose : null,
      previousClose,
      open: last?.open ?? null,
      dayLow: m.dayLow,
      dayHigh: m.dayHigh,
      fiftyTwoWeekLow: low,
      fiftyTwoWeekHigh: high,
      rangePosition,
      volume: m.volume ?? last?.volume ?? null,
      avgVolume,
      currency: m.currency,
      updatedAt: m.updatedAt,
      range,
      returns,
      history,
      ok: history.length > 1,
      detail: 'Yahoo Finance · /v8/finance/chart',
    } satisfies StockDetail;
  } catch (err) {
    return empty(err instanceof Error ? err.message : 'falha ao consultar a série');
  }
}
