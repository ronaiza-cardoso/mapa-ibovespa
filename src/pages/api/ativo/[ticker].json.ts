import type { APIRoute } from 'astro';
import { buildStockDetail, normalizeRange } from '../../../lib/detail';

export const prerender = false;

/** Detalhe de um ativo (cotação + série histórica) para a gaveta do painel. */
export const GET: APIRoute = async ({ params, url }) => {
  const ticker = String(params.ticker ?? '').toUpperCase();
  if (!/^[A-Z]{4}\d{1,2}$/.test(ticker)) {
    return new Response(JSON.stringify({ error: true, message: 'ticker inválido' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const detail = await buildStockDetail(ticker, normalizeRange(url.searchParams.get('range')));
  return new Response(JSON.stringify(detail), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=120, stale-while-revalidate=600',
    },
  });
};
