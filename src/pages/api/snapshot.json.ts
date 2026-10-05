import type { APIRoute } from 'astro';
import { toLocale } from '../../i18n';
import { buildSnapshot } from '../../lib/snapshot';

export const prerender = false;

/** Retrato atual do índice, consumido pelo mapa a cada atualização. */
export const GET: APIRoute = async ({ url }) => {
  try {
    const snapshot = await buildSnapshot(toLocale(url.searchParams.get('lang')));
    return new Response(JSON.stringify(snapshot), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=30, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: true, message: err instanceof Error ? err.message : 'falha inesperada' }),
      { status: 502, headers: { 'content-type': 'application/json; charset=utf-8' } }
    );
  }
};
