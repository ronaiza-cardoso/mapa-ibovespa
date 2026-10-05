import { cached, getJSON } from './cache';
import type { IndexMember } from './types';

/**
 * Carteira teórica do Ibovespa, direto do site de índices da B3 (dado público).
 * O endpoint recebe os parâmetros como JSON em base64 na própria URL.
 */
const HOST = 'https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay';

export const B3_PAGE = 'https://sistemaswebb3-listados.b3.com.br/indexPage/day/IBOV?language=pt-br';

function endpoint(index = 'IBOV', pageSize = 300): string {
  const params = { language: 'pt-br', pageNumber: 1, pageSize, index, segment: '1' };
  return `${HOST}/${Buffer.from(JSON.stringify(params)).toString('base64')}`;
}

/** "478.975.645" -> 478975645 ; "0,543" -> 0.543 */
function parseBR(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const n = Number(value.trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** "05/10/26" (DD/MM/AA) -> "2026-10-05" */
function parseDate(value: unknown): string {
  const m = typeof value === 'string' && value.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return new Date().toISOString().slice(0, 10);
  const [, d, mo, y] = m;
  const year = y!.length === 2 ? `20${y}` : y;
  return `${year}-${mo}-${d}`;
}

export interface Composition {
  date: string;
  members: IndexMember[];
}

export async function fetchComposition(index = 'IBOV'): Promise<Composition> {
  // A carteira muda a cada reequilíbrio (4 meses), mas os pesos são recalculados
  // diariamente — 30 min de cache é folgado e ainda pega o fechamento do dia.
  return cached(`b3:${index}`, 30 * 60_000, async () => {
    const data = await getJSON(endpoint(index));
    const rows: any[] = Array.isArray(data?.results) ? data.results : [];
    if (!rows.length) throw new Error('carteira da B3 vazia');

    const members = rows
      .map((r): IndexMember => ({
        ticker: String(r.cod ?? '').trim().toUpperCase(),
        asset: String(r.asset ?? '').trim(),
        type: String(r.type ?? '').replace(/\s+/g, ' ').trim(),
        weight: parseBR(r.part),
        theoreticalQty: parseBR(r.theoricalQty),
      }))
      .filter((m) => m.ticker);

    return { date: parseDate(data?.header?.date), members };
  });
}
