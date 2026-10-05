import { dict, LOCALE_PATH, LOCALES, type Locale } from '../i18n';
import type { Snapshot } from './types';

/**
 * Metadados de descoberta: canônica, alternativas por idioma, Open Graph,
 * Twitter card e JSON-LD.
 *
 * A origem vem de `Astro.site` (variável SITE_URL) quando existe e, se não,
 * da própria requisição — assim nada de domínio chutado no HTML em
 * desenvolvimento, e a canônica fica certa assim que o site tiver domínio.
 */
const OG_LOCALE: Record<Locale, string> = { 'pt-BR': 'pt_BR', en: 'en_US' };
/** Cada idioma tem seu cartão; gerados por `npm run images`. */
const OG_IMAGE: Record<Locale, string> = { 'pt-BR': '/og.png', en: '/og-en.png' };

/**
 * Origem canônica, em ordem de confiança: SITE_URL (via `Astro.site`), depois os
 * cabeçalhos da requisição e, por último, a URL que o adaptador montou — que no
 * servidor Node sozinho vira `http://localhost/` e não serve para canônica.
 */
export function resolveOrigin(requestUrl: URL, site: URL | undefined, headers: Headers): URL {
  if (site) return site;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (host) {
    const local = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(host);
    const proto = headers.get('x-forwarded-proto') ?? (local ? 'http' : 'https');
    try {
      return new URL(`${proto}://${host}`);
    } catch {
      /* cabeçalho malformado: cai para a URL da requisição */
    }
  }
  return new URL(requestUrl.origin);
}

export interface Seo {
  canonical: string;
  alternates: { hreflang: string; href: string }[];
  ogImage: string;
  ogLocale: string;
  ogLocaleAlternates: string[];
  jsonLd: string;
}

export function buildSeo(
  lang: Locale,
  requestUrl: URL,
  site: URL | undefined,
  headers: Headers,
  snapshot: Snapshot
): Seo {
  const t = dict(lang);
  const origin = resolveOrigin(requestUrl, site, headers);
  const abs = (path: string) => new URL(path, origin).href;

  const canonical = abs(LOCALE_PATH[lang]);
  const alternates = [
    ...LOCALES.map((code) => ({ hreflang: code, href: abs(LOCALE_PATH[code]) })),
    // x-default aponta para a versão em português, que é a raiz do site.
    { hreflang: 'x-default', href: abs(LOCALE_PATH['pt-BR']) },
  ];

  const website = {
    '@type': 'WebSite',
    '@id': `${abs('/')}#website`,
    url: abs('/'),
    name: t.siteName,
    description: t.description,
    inLanguage: LOCALES.map((code) => dict(code).htmlLang),
  };

  const webPage = {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: t.title,
    description: t.description,
    inLanguage: t.htmlLang,
    isPartOf: { '@id': website['@id'] },
    dateModified: snapshot.fetchedAt,
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(OG_IMAGE[lang]), caption: t.ogImageAlt },
  };

  const application = {
    '@type': 'WebApplication',
    '@id': `${abs('/')}#app`,
    name: t.siteName,
    url: canonical,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    browserRequirements: 'JavaScript',
    inLanguage: t.htmlLang,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    featureList: t.appFeatures,
  };

  // O painel publica um conjunto de dados de fato; descrevê-lo como tal dá ao
  // buscador o que ele precisa, e as fontes ficam creditadas em isBasedOn.
  const dataset = {
    '@type': 'Dataset',
    '@id': `${canonical}#dataset`,
    name: t.datasetName,
    description: t.datasetDescription,
    url: canonical,
    inLanguage: t.htmlLang,
    keywords: t.keywords,
    temporalCoverage: snapshot.portfolioDate,
    dateModified: snapshot.fetchedAt,
    isAccessibleForFree: true,
    measurementTechnique: 'Agregação de APIs públicas da B3, brapi.dev e Yahoo Finance',
    variableMeasured: [
      { '@type': 'PropertyValue', name: t.thTicker },
      { '@type': 'PropertyValue', name: t.thAsset },
      { '@type': 'PropertyValue', name: t.thSector },
      { '@type': 'PropertyValue', name: t.thWeight, unitText: '%' },
      { '@type': 'PropertyValue', name: t.thPrice, unitCode: 'BRL' },
      { '@type': 'PropertyValue', name: t.thChange, unitText: '%' },
      { '@type': 'PropertyValue', name: t.thMarketCap, unitCode: 'BRL' },
      { '@type': 'PropertyValue', name: t.thVolume },
    ],
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: abs(`/api/snapshot.json?lang=${lang}`),
        name: t.datasetName,
      },
    ],
    isBasedOn: snapshot.sources.map((s) => ({ '@type': 'WebPage', name: s.name, url: s.url })),
  };

  return {
    canonical,
    alternates,
    ogImage: abs(OG_IMAGE[lang]),
    ogLocale: OG_LOCALE[lang],
    ogLocaleAlternates: LOCALES.filter((c) => c !== lang).map((c) => OG_LOCALE[c]),
    jsonLd: JSON.stringify({ '@context': 'https://schema.org', '@graph': [website, webPage, application, dataset] }),
  };
}
