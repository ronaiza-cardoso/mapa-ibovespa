/**
 * Textos do painel em português e inglês.
 *
 * Tudo que aparece na tela — inclusive o que o JavaScript escreve depois —
 * sai daqui. O servidor serializa o dicionário do idioma da página num
 * <script type="application/json">, e o cliente lê de lá.
 */

export const LOCALES = ['pt-BR', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';

/** Prefixo de rota de cada idioma: o português mora na raiz. */
export const LOCALE_PATH: Record<Locale, string> = { 'pt-BR': '/', en: '/en' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Setores como a brapi devolve (taxonomia em inglês) → rótulo curto por idioma. */
const SECTORS: Record<string, Record<Locale, string>> = {
  Finance: { 'pt-BR': 'Financeiro', en: 'Financials' },
  'Non-Energy Minerals': { 'pt-BR': 'Mineração e Siderurgia', en: 'Mining & Steel' },
  'Energy Minerals': { 'pt-BR': 'Petróleo e Gás', en: 'Oil & Gas' },
  Utilities: { 'pt-BR': 'Energia e Saneamento', en: 'Utilities' },
  'Retail Trade': { 'pt-BR': 'Varejo', en: 'Retail' },
  'Consumer Non-Durables': { 'pt-BR': 'Consumo não durável', en: 'Consumer Staples' },
  'Consumer Durables': { 'pt-BR': 'Consumo durável', en: 'Consumer Durables' },
  'Consumer Services': { 'pt-BR': 'Serviços ao consumidor', en: 'Consumer Services' },
  'Health Services': { 'pt-BR': 'Serviços de saúde', en: 'Health Services' },
  'Health Technology': { 'pt-BR': 'Saúde e farmacêutica', en: 'Healthcare & Pharma' },
  'Process Industries': { 'pt-BR': 'Papel e celulose', en: 'Pulp & Paper' },
  'Producer Manufacturing': { 'pt-BR': 'Bens industriais', en: 'Industrials' },
  'Electronic Technology': { 'pt-BR': 'Tecnologia eletrônica', en: 'Electronic Technology' },
  'Technology Services': { 'pt-BR': 'Tecnologia', en: 'Technology' },
  Transportation: { 'pt-BR': 'Transporte e logística', en: 'Transport & Logistics' },
  'Commercial Services': { 'pt-BR': 'Serviços comerciais', en: 'Commercial Services' },
  'Distribution Services': { 'pt-BR': 'Distribuição', en: 'Distribution' },
  Communications: { 'pt-BR': 'Telecomunicações', en: 'Telecom' },
  'Industrial Services': { 'pt-BR': 'Serviços industriais', en: 'Industrial Services' },
  Miscellaneous: { 'pt-BR': 'Diversos', en: 'Miscellaneous' },
};

/** Setor de recurso para tickers que a cotação não classifica. */
const SECTOR_FALLBACK: Record<string, string> = {
  AXIA3: 'Utilities',
  ISAE4: 'Utilities',
  EMBJ3: 'Producer Manufacturing',
  MBRF3: 'Consumer Non-Durables',
  MOTV3: 'Communications',
  BRAV3: 'Energy Minerals',
};

export function sectorLabel(ticker: string, raw: string | null | undefined, locale: Locale): string {
  const key = raw || SECTOR_FALLBACK[ticker];
  if (key && SECTORS[key]) return SECTORS[key][locale];
  return key ?? (locale === 'en' ? 'Other' : 'Outros');
}

export interface Dict {
  code: Locale;
  name: string;
  htmlLang: string;
  title: string;
  description: string;
  siteName: string;
  /** Frase curta do cartão de compartilhamento; aparece na imagem. */
  ogTagline: string;
  ogImageAlt: string;
  keywords: string[];
  datasetName: string;
  datasetDescription: string;
  appFeatures: string[];
  skipToTable: string;
  switchTo: string;

  heading: string;
  subtitle: string;
  weighted: string;
  weightedNote: string;
  indexLabel: string;
  indexNote: string;
  indexPoints: string;
  breadth: string;
  breadthNote: string;
  breadthAria: string;

  controlsAria: string;
  size: string;
  sizeWeight: string;
  sizeWeightShort: string;
  sizeMarketCap: string;
  sizeMarketCapShort: string;
  sizeTurnover: string;
  sizeTurnoverShort: string;
  group: string;
  groupSector: string;
  groupSubsector: string;
  groupNone: string;
  search: string;
  searchPlaceholder: string;
  showTable: string;
  hideTable: string;
  refresh: string;
  appearance: string;
  colors: string;
  colorAccessible: string;
  colorAccessibleHint: string;
  colorClassic: string;
  colorClassicHint: string;
  theme: string;
  themeAuto: string;
  themeLight: string;
  themeDark: string;
  texture: string;

  mapAria: string;
  crumbsAria: string;
  root: string;
  hintRoot: string;
  hintDeep: string;
  otherSectors: string;
  ofIndex: string;

  legendColor: string;
  legendScaleAria: string;
  legendArea: string;
  legendNote: string;
  legendLow: string;
  legendHigh: string;
  bands: string[];

  tableTitle: string;
  tableCaption: string;
  thTicker: string;
  thAsset: string;
  thSector: string;
  thWeight: string;
  thPrice: string;
  thChange: string;
  thMarketCap: string;
  thVolume: string;

  close: string;
  period: string;
  ranges: Record<string, string>;
  chartTitle: string;
  chartLoading: string;
  chartUnavailable: string;
  chartNote: string;
  chartAria: string;
  chartMin: string;
  chartMax: string;
  detailFail: string;
  seriesCaption: string;
  seriesDate: string;
  seriesClose: string;
  statPrice: string;
  statChange: string;
  statWeight: string;
  statMarketCap: string;
  statVolume: string;
  statTurnover: string;
  statOpen: string;
  statDayRange: string;
  statRange52: string;
  statReturns: string;
  returnYtd: string;
  statAvgVolume: string;
  statVsAvg: string;
  range52Aria: string;

  sourceB3: string;
  sourceBrapi: string;
  sourceYahoo: string;
  sourceIndexOk: string;
  sourceIndexDown: string;
  sourceAssets: string;
  sourcePapers: string;
  sourceDownB3: string;
  sourceDownBrapi: string;
  degraded: string;
  disclaimer: string;

  liveRoot: string;
  liveGroup: string;
  liveLeaf: string;
  liveMatches: string;
  liveSize: string;
  liveUpdated: string;
  liveUpdateFail: string;
  tileAria: string;
  groupAria: string;
}

const PT: Dict = {
  code: 'pt-BR',
  name: 'Português',
  htmlLang: 'pt-BR',
  title: 'Mapa do Ibovespa — painel interativo',
  description:
    'Mapa interativo das ações que compõem o Ibovespa: área por peso no índice, cor pela variação do dia, com zoom por setor e por ativo. Dados públicos da B3 e da brapi.',
  siteName: 'Mapa do Ibovespa',
  ogTagline: 'Área por peso no índice · cor pela variação do dia',
  ogImageAlt:
    'Mapa de áreas do Ibovespa: um retângulo por ação, com área proporcional ao peso no índice e cor pela variação do dia.',
  keywords: [
    'Ibovespa', 'IBOV', 'B3', 'bolsa brasileira', 'ações', 'carteira teórica',
    'mapa do mercado', 'treemap', 'variação do dia', 'peso no índice', 'cotações',
  ],
  datasetName: 'Carteira teórica do Ibovespa com cotações do dia',
  datasetDescription:
    'Composição oficial do Ibovespa publicada pela B3 — ticker, nome, especificação, quantidade teórica e peso no índice — combinada com preço, variação do dia, valor de mercado, volume e setor de cada ação.',
  appFeatures: [
    'Mapa de áreas das ações do Ibovespa',
    'Zoom por setor e por ativo',
    'Área por peso no índice, valor de mercado ou volume financeiro',
    'Histórico de preço com retornos acumulados',
    'Tabela equivalente e paleta à prova de daltonismo',
  ],
  skipToTable: 'Ir para a tabela de dados',
  switchTo: 'Ver em inglês',

  heading: 'Ibovespa — mapa da carteira teórica',
  subtitle: '{n} ativos · carteira de {portfolio} · cotações de {fetched}',
  weighted: 'Variação ponderada',
  weightedNote: 'proxy do índice, pelos pesos oficiais',
  indexLabel: 'Ibovespa',
  indexNote: '{points} pontos · fechamento anterior {previous}',
  indexPoints: 'pontos',
  breadth: 'Amplitude do dia',
  breadthNote: 'altas / baixas',
  breadthAria: '{up} ativos em alta, {flat} estáveis, {down} em baixa',

  controlsAria: 'Controles do mapa',
  size: 'Tamanho',
  sizeWeight: 'Peso no índice',
  sizeWeightShort: 'Peso',
  sizeMarketCap: 'Valor de mercado',
  sizeMarketCapShort: 'Valor',
  sizeTurnover: 'Volume financeiro',
  sizeTurnoverShort: 'Volume',
  group: 'Agrupar',
  groupSector: 'Por setor',
  groupSubsector: 'Por subsetor',
  groupNone: 'Sem agrupamento',
  search: 'Buscar',
  searchPlaceholder: 'PETR4, Vale, banco…',
  showTable: 'Ver tabela',
  hideTable: 'Ocultar tabela',
  refresh: 'Atualizar',
  appearance: 'Aparência',
  colors: 'Cores',
  colorAccessible: 'Azul / vermelho',
  colorAccessibleHint: 'Azul (alta) e vermelho (baixa): separação de ΔE 22 sob daltonismo',
  colorClassic: 'Verde / vermelho',
  colorClassicHint:
    'Verde (alta) e vermelho (baixa): convenção do mercado, mas ΔE 1,4 sob deuteranopia',
  theme: 'Tema',
  themeAuto: 'Auto',
  themeLight: 'Claro',
  themeDark: 'Escuro',
  texture: 'Textura (padrão em vez de cor)',

  mapAria: 'Mapa do Ibovespa',
  crumbsAria: 'Navegação do mapa',
  root: 'Ibovespa',
  hintRoot: 'Clique para dar zoom · Esc volta um nível',
  hintDeep: 'Esc volta um nível · clique no caminho acima',
  otherSectors: 'Outros setores',
  ofIndex: '{w} do índice',

  legendColor: 'Cor: variação do dia',
  legendScaleAria:
    'Escala divergente em sete faixas, de queda de 2,5% ou mais a alta de 2,5% ou mais, com cinza no centro para variação de até 0,25%',
  legendArea: 'Área:',
  legendNote: 'Cada área mostra a variação em número — a cor nunca é o único sinal.',
  legendLow: '≤ −2,5%',
  legendHigh: '≥ +2,5%',
  bands: [
    'queda de 2,5% ou mais',
    'queda entre 1% e 2,5%',
    'queda entre 0,25% e 1%',
    'variação de até 0,25%, para qualquer lado',
    'alta entre 0,25% e 1%',
    'alta entre 1% e 2,5%',
    'alta de 2,5% ou mais',
  ],

  tableTitle: 'Ações que compõem o Ibovespa',
  tableCaption: 'Carteira teórica do Ibovespa — {n} ativos, ordenados por peso no índice.',
  thTicker: 'Ticker',
  thAsset: 'Ativo',
  thSector: 'Setor',
  thWeight: 'Peso',
  thPrice: 'Preço',
  thChange: 'Var. dia',
  thMarketCap: 'Valor de mercado',
  thVolume: 'Volume (ações)',

  close: 'Fechar',
  period: 'Período',
  ranges: { '1mo': '1 mês', '3mo': '3 meses', '6mo': '6 meses', '1y': '1 ano', '5y': '5 anos' },
  chartTitle: 'Fechamento de {ticker}',
  chartLoading: 'Carregando série histórica…',
  chartUnavailable: 'Série histórica indisponível agora ({detail}).',
  chartNote:
    '{n} fechamentos, de {from} a {to} · variação no período {variation}. Atualizado em {updated}.',
  chartAria:
    'Fechamento de {from} a {to}: mínimo {min}, máximo {max}, último {last}. A tabela abaixo traz a série completa.',
  chartMin: 'mín',
  chartMax: 'máx',
  detailFail: 'Não foi possível carregar a série histórica deste ativo.',
  seriesCaption: 'Série usada no gráfico',
  seriesDate: 'Data',
  seriesClose: 'Fechamento',
  statPrice: 'Preço',
  statChange: 'Variação do dia',
  statWeight: 'Peso no índice',
  statMarketCap: 'Valor de mercado',
  statVolume: 'Volume (ações)',
  statTurnover: 'Volume financeiro',
  statOpen: 'Abertura',
  statDayRange: 'Mín/máx do dia',
  statRange52: 'Mín/máx 52 sem.',
  statReturns: 'Retorno acumulado',
  returnYtd: 'No ano',
  statAvgVolume: 'Volume médio (30 pregões)',
  statVsAvg: '{pct} da média de 30 pregões',
  range52Aria: 'Preço em {pct} da faixa de 52 semanas, entre {low} e {high}',

  sourceB3: 'Carteira teórica do IBOV — B3',
  sourceBrapi: 'Cotações — brapi.dev',
  sourceYahoo: 'Índice e histórico — Yahoo Finance',
  sourceIndexOk: 'pontos do IBOV e séries dos ativos',
  sourceIndexDown: 'índice indisponível, usando a variação ponderada',
  sourceAssets: '{n} ativos',
  sourcePapers: '{n} papéis',
  sourceDownB3: 'indisponível, usando retrato local de {date}',
  sourceDownBrapi: 'indisponível, usando retrato local',
  degraded:
    'Alguma origem pública não respondeu agora; parte dos números vem do retrato local gravado em {when}. Use “Atualizar” para tentar de novo.',
  disclaimer:
    'Dados públicos, sem cadastro: carteira teórica e pesos pela B3; preço, variação, valor de mercado e setor pela brapi.dev. A “variação ponderada” é calculada aqui a partir dos pesos oficiais e serve como proxy do índice — não é a cotação oficial do Ibovespa. As posições menores recebem uma área mínima para o código do papel caber dentro da caixa; o peso exato de cada ativo está no próprio rótulo, no tooltip e na tabela. Painel informativo, não é recomendação de investimento.',

  liveRoot: 'Mapa completo: {n} ativos.',
  liveGroup: 'Zoom em {group}.',
  liveLeaf: 'Zoom em {ticker}.',
  liveMatches: '{n} ativos correspondem a “{query}”.',
  liveSize: 'Área das caixas agora representa {label}.',
  liveUpdated: 'Dados atualizados às {when}.',
  liveUpdateFail:
    'Não foi possível atualizar agora; os números na tela são os da última consulta.',
  tileAria:
    '{ticker}, {name}. Variação do dia {change}. Preço {price}. Peso no índice {weight}. Setor {sector}. Abre o detalhe e dá zoom.',
  groupAria: '{group}: {n} ativos, {weight} do índice, {metricLabel} {metric}. Dá zoom no grupo.',
};

const EN: Dict = {
  code: 'en',
  name: 'English',
  htmlLang: 'en',
  title: 'Ibovespa map — interactive dashboard',
  description:
    'Interactive map of the stocks in Brazil’s Ibovespa index: area by index weight, colour by daily change, with zoom by sector and by stock. Public data from B3 and brapi.',
  siteName: 'Ibovespa Map',
  ogTagline: 'Area by index weight · colour by daily change',
  ogImageAlt:
    'Treemap of the Ibovespa index: one rectangle per stock, sized by index weight and coloured by the daily change.',
  keywords: [
    'Ibovespa', 'IBOV', 'B3', 'Brazilian stock market', 'Brazil stocks',
    'index portfolio', 'market map', 'treemap', 'daily change', 'index weight', 'quotes',
  ],
  datasetName: 'Ibovespa index portfolio with daily quotes',
  datasetDescription:
    'Official Ibovespa composition published by B3 — ticker, company, share class, theoretical quantity and index weight — combined with each stock’s price, daily change, market cap, volume and sector.',
  appFeatures: [
    'Treemap of the Ibovespa constituents',
    'Zoom by sector and by stock',
    'Area by index weight, market cap or traded value',
    'Price history with cumulative returns',
    'Equivalent data table and colour-blind-safe palette',
  ],
  skipToTable: 'Skip to the data table',
  switchTo: 'View in Portuguese',

  heading: 'Ibovespa — index portfolio map',
  subtitle: '{n} stocks · portfolio of {portfolio} · quotes from {fetched}',
  weighted: 'Weighted change',
  weightedNote: 'index proxy, from the official weights',
  indexLabel: 'Ibovespa',
  indexNote: '{points} points · previous close {previous}',
  indexPoints: 'points',
  breadth: 'Market breadth',
  breadthNote: 'up / down',
  breadthAria: '{up} stocks up, {flat} flat, {down} down',

  controlsAria: 'Map controls',
  size: 'Size',
  sizeWeight: 'Index weight',
  sizeWeightShort: 'Weight',
  sizeMarketCap: 'Market cap',
  sizeMarketCapShort: 'Cap',
  sizeTurnover: 'Traded value',
  sizeTurnoverShort: 'Value',
  group: 'Group',
  groupSector: 'By sector',
  groupSubsector: 'By subsector',
  groupNone: 'No grouping',
  search: 'Search',
  searchPlaceholder: 'PETR4, Vale, bank…',
  showTable: 'Show table',
  hideTable: 'Hide table',
  refresh: 'Refresh',
  appearance: 'Appearance',
  colors: 'Colours',
  colorAccessible: 'Blue / red',
  colorAccessibleHint: 'Blue (up) and red (down): ΔE 22 apart under colour blindness',
  colorClassic: 'Green / red',
  colorClassicHint: 'Green (up) and red (down): the market convention, but ΔE 1.4 under deuteranopia',
  theme: 'Theme',
  themeAuto: 'Auto',
  themeLight: 'Light',
  themeDark: 'Dark',
  texture: 'Texture (pattern instead of colour)',

  mapAria: 'Ibovespa map',
  crumbsAria: 'Map navigation',
  root: 'Ibovespa',
  hintRoot: 'Click to zoom in · Esc goes back one level',
  hintDeep: 'Esc goes back one level · or click the path above',
  otherSectors: 'Other sectors',
  ofIndex: '{w} of the index',

  legendColor: 'Colour: daily change',
  legendScaleAria:
    'Diverging scale in seven bands, from a fall of 2.5% or more to a rise of 2.5% or more, with grey in the middle for changes under 0.25%',
  legendArea: 'Area:',
  legendNote: 'Every box states its change as a number — colour is never the only cue.',
  legendLow: '≤ −2.5%',
  legendHigh: '≥ +2.5%',
  bands: [
    'fall of 2.5% or more',
    'fall between 1% and 2.5%',
    'fall between 0.25% and 1%',
    'change under 0.25%, either way',
    'rise between 0.25% and 1%',
    'rise between 1% and 2.5%',
    'rise of 2.5% or more',
  ],

  tableTitle: 'Stocks in the Ibovespa index',
  tableCaption: 'Ibovespa index portfolio — {n} stocks, ordered by index weight.',
  thTicker: 'Ticker',
  thAsset: 'Company',
  thSector: 'Sector',
  thWeight: 'Weight',
  thPrice: 'Price',
  thChange: 'Day',
  thMarketCap: 'Market cap',
  thVolume: 'Volume (shares)',

  close: 'Close',
  period: 'Period',
  ranges: { '1mo': '1 month', '3mo': '3 months', '6mo': '6 months', '1y': '1 year', '5y': '5 years' },
  chartTitle: '{ticker} closing price',
  chartLoading: 'Loading price history…',
  chartUnavailable: 'Price history unavailable right now ({detail}).',
  chartNote: '{n} closes, from {from} to {to} · change over the period {variation}. Updated {updated}.',
  chartAria:
    'Closing price from {from} to {to}: low {min}, high {max}, last {last}. The table below has the full series.',
  chartMin: 'low',
  chartMax: 'high',
  detailFail: 'Could not load the price history for this stock.',
  seriesCaption: 'Series behind the chart',
  seriesDate: 'Date',
  seriesClose: 'Close',
  statPrice: 'Price',
  statChange: 'Day change',
  statWeight: 'Index weight',
  statMarketCap: 'Market cap',
  statVolume: 'Volume (shares)',
  statTurnover: 'Traded value',
  statOpen: 'Open',
  statDayRange: 'Day low/high',
  statRange52: '52-week low/high',
  statReturns: 'Cumulative return',
  returnYtd: 'YTD',
  statAvgVolume: 'Average volume (30 sessions)',
  statVsAvg: '{pct} of the 30-session average',
  range52Aria: 'Price at {pct} of the 52-week range, between {low} and {high}',

  sourceB3: 'IBOV index portfolio — B3',
  sourceBrapi: 'Quotes — brapi.dev',
  sourceYahoo: 'Index and history — Yahoo Finance',
  sourceIndexOk: 'IBOV points and per-stock series',
  sourceIndexDown: 'index unavailable, falling back to the weighted change',
  sourceAssets: '{n} stocks',
  sourcePapers: '{n} tickers',
  sourceDownB3: 'unavailable, falling back to the local snapshot of {date}',
  sourceDownBrapi: 'unavailable, falling back to the local snapshot',
  degraded:
    'A public source did not answer just now; some numbers come from the local snapshot taken at {when}. Hit “Refresh” to try again.',
  disclaimer:
    'Public data, no sign-up: index portfolio and weights from B3; price, change, market cap and sector from brapi.dev. The “weighted change” is computed here from the official weights and stands in for the index — it is not the official Ibovespa quote. The smallest positions get a minimum area so the ticker fits inside the box; each stock’s exact weight is in its own label, in the tooltip and in the table. Informational dashboard, not investment advice.',

  liveRoot: 'Full map: {n} stocks.',
  liveGroup: 'Zoomed into {group}.',
  liveLeaf: 'Zoomed into {ticker}.',
  liveMatches: '{n} stocks match “{query}”.',
  liveSize: 'Box area now represents {label}.',
  liveUpdated: 'Data refreshed at {when}.',
  liveUpdateFail: 'Could not refresh just now; the numbers on screen are from the last successful call.',
  tileAria:
    '{ticker}, {name}. Day change {change}. Price {price}. Index weight {weight}. Sector {sector}. Opens the detail and zooms in.',
  groupAria: '{group}: {n} stocks, {weight} of the index, {metricLabel} {metric}. Zooms into the group.',
};

const DICTS: Record<Locale, Dict> = { 'pt-BR': PT, en: EN };

export function dict(locale: Locale): Dict {
  return DICTS[locale];
}

/** Interpola {chaves} — mantém o texto legível no dicionário. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`
  );
}
