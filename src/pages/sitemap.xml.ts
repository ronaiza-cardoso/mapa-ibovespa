import type { APIRoute } from 'astro';
import { LOCALE_PATH, LOCALES } from '../i18n';
import { resolveOrigin } from '../lib/seo';

export const prerender = false;

/**
 * Sitemap com as duas versões de idioma referenciando uma à outra por
 * xhtml:link — é assim que o Google entende que são a mesma página traduzida,
 * e não conteúdo duplicado.
 */
export const GET: APIRoute = ({ url, site, request }) => {
  const origin = resolveOrigin(url, site, request.headers);
  const abs = (path: string) => new URL(path, origin).href;
  const lastmod = new Date().toISOString().slice(0, 10);

  const alternates = [
    ...LOCALES.map((code) => `      <xhtml:link rel="alternate" hreflang="${code}" href="${abs(LOCALE_PATH[code])}" />`),
    `      <xhtml:link rel="alternate" hreflang="x-default" href="${abs(LOCALE_PATH['pt-BR'])}" />`,
  ].join('\n');

  const entries = LOCALES.map((code) =>
    [
      '  <url>',
      `    <loc>${abs(LOCALE_PATH[code])}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      '    <changefreq>hourly</changefreq>',
      `    <priority>${code === 'pt-BR' ? '1.0' : '0.9'}</priority>`,
      alternates,
      '  </url>',
    ].join('\n')
  ).join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
