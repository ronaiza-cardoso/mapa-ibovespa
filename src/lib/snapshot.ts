import { B3_PAGE, fetchComposition } from './b3';
import { BRAPI_PAGE, fetchMarketList, type ListQuote } from './brapi';
import { fetchIndexQuote, YAHOO_PAGE } from './yahoo';
import { dict, fill, sectorLabel, type Locale } from '../i18n';
import type { Snapshot, SourceStatus, Stock } from './types';
import fallback from '../data/fallback.json';

/**
 * Junta a carteira oficial da B3 (quem está no índice e com que peso) com as
 * cotações do dia (preço, variação, setor). As duas origens são públicas e
 * independentes; se uma falhar, usamos o retrato local de contingência
 * (src/data/fallback.json) e marcamos o painel como degradado.
 *
 * O locale só afeta os rótulos (setor e origens); os números são os mesmos.
 */
export async function buildSnapshot(locale: Locale): Promise<Snapshot> {
  const t = dict(locale);
  const sources: SourceStatus[] = [];
  let degraded = false;

  const [compositionResult, quotesResult, indexResult] = await Promise.allSettled([
    fetchComposition('IBOV'),
    fetchMarketList(),
    fetchIndexQuote(),
  ]);

  let portfolioDate: string;
  let members: { ticker: string; asset: string; type: string; weight: number; theoreticalQty: number }[];

  if (compositionResult.status === 'fulfilled' && compositionResult.value.members.length) {
    portfolioDate = compositionResult.value.date;
    members = compositionResult.value.members;
    sources.push({
      name: t.sourceB3,
      url: B3_PAGE,
      ok: true,
      detail: fill(t.sourceAssets, { n: members.length }),
    });
  } else {
    degraded = true;
    portfolioDate = fallback.portfolioDate;
    members = fallback.stocks.map((s) => ({
      ticker: s.ticker, asset: s.asset, type: s.type, weight: s.weight, theoreticalQty: s.theoreticalQty,
    }));
    sources.push({
      name: t.sourceB3,
      url: B3_PAGE,
      ok: false,
      detail: fill(t.sourceDownB3, { date: portfolioDate }),
    });
  }

  let quotes: Map<string, ListQuote>;
  if (quotesResult.status === 'fulfilled' && quotesResult.value.size) {
    quotes = quotesResult.value;
    sources.push({
      name: t.sourceBrapi,
      url: BRAPI_PAGE,
      ok: true,
      detail: fill(t.sourcePapers, { n: quotes.size }),
    });
  } else {
    degraded = true;
    quotes = new Map(
      fallback.stocks.map((s) => [
        s.ticker,
        {
          ticker: s.ticker, name: s.name, price: s.price, changePct: s.changePct,
          volume: s.volume, marketCap: s.marketCap, sector: s.sector, subsector: s.subsector,
          logo: s.logo,
        } satisfies ListQuote,
      ])
    );
    sources.push({ name: t.sourceBrapi, url: BRAPI_PAGE, ok: false, detail: t.sourceDownBrapi });
  }

  const index = indexResult.status === 'fulfilled' ? indexResult.value : null;
  sources.push({
    name: t.sourceYahoo,
    url: YAHOO_PAGE,
    ok: index != null,
    detail: index != null ? t.sourceIndexOk : t.sourceIndexDown,
  });

  const stocks: Stock[] = members.map((m) => {
    const q = quotes.get(m.ticker);
    const price = q?.price ?? null;
    const volume = q?.volume ?? null;
    return {
      ...m,
      name: q?.name ?? m.asset,
      sector: sectorLabel(m.ticker, q?.sector, locale),
      subsector: q?.subsector ?? '',
      price,
      changePct: q?.changePct ?? null,
      marketCap: q?.marketCap ?? null,
      volume,
      turnover: price != null && volume != null ? price * volume : null,
      logo: q?.logo ?? null,
    };
  });

  stocks.sort((a, b) => b.weight - a.weight);

  let up = 0, down = 0, flat = 0, weighted = 0, coveredWeight = 0;
  for (const s of stocks) {
    if (s.changePct == null) continue;
    if (s.changePct > 0) up++;
    else if (s.changePct < 0) down++;
    else flat++;
    weighted += s.changePct * s.weight;
    coveredWeight += s.weight;
  }

  return {
    portfolioDate,
    fetchedAt: new Date().toISOString(),
    stocks,
    index,
    totals: {
      members: stocks.length,
      up,
      down,
      flat,
      weightedChangePct: coveredWeight > 0 ? weighted / coveredWeight : null,
      coveredWeight,
    },
    sources,
    degraded,
  };
}
