import type { APIRoute } from 'astro';
import { resolveOrigin } from '../lib/seo';

export const prerender = false;

/**
 * robots.txt gerado na requisição para que o sitemap aponte para a origem certa
 * mesmo sem SITE_URL definida. As rotas /api/ ficam liberadas de propósito: são
 * as distribuições declaradas no JSON-LD do conjunto de dados.
 */
export const GET: APIRoute = ({ url, site, request }) => {
  const origin = resolveOrigin(url, site, request.headers).origin;
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
