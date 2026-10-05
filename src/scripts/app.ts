import { fill, toLocale, type Dict } from '../i18n';
import { formatters } from '../lib/format';
import type { ReturnKey, Snapshot, Stock, StockDetail } from '../lib/types';
import { renderChart } from './chart';
import { IbovMap, type Focus, type GroupBy, type SizeBy } from './treemap';

/* ---------- idioma ---------- */

const locale = toLocale(document.documentElement.lang);
const t: Dict = JSON.parse(document.getElementById('i18n-data')!.textContent!);
const f = formatters(locale);

/* ---------- preferências ---------- */

interface Prefs {
  sizeBy: SizeBy;
  groupBy: GroupBy;
  palette: 'accessible' | 'classic';
  theme: 'auto' | 'light' | 'dark';
  texture: boolean;
  tableOpen: boolean;
}

const DEFAULTS: Prefs = {
  sizeBy: 'weight',
  groupBy: 'sector',
  palette: 'accessible',
  theme: 'auto',
  texture: false,
  tableOpen: false,
};

const prefs: Prefs = (() => {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem('ibov-prefs') ?? '{}') as Partial<Prefs>) };
  } catch {
    return { ...DEFAULTS };
  }
})();

function savePrefs(): void {
  try {
    localStorage.setItem('ibov-prefs', JSON.stringify(prefs));
  } catch {
    /* navegação privada: seguimos sem persistir */
  }
}

/* ---------- atalhos de DOM ---------- */

const $ = <T extends HTMLElement = HTMLElement>(role: string, scope: ParentNode = document) =>
  scope.querySelector<T>(`[data-role="${role}"]`);

const mapHost = $('map')!;
const live = $('live')!;
const crumbs = $('crumbs')!;
const tableView = $('table-view')!;
const drawer = $('drawer')!;
const backdrop = $('backdrop')!;

let snapshot: Snapshot = JSON.parse(document.getElementById('snapshot-data')!.textContent!);
let detailRange = '3mo';
let currentTicker: string | null = null;
let lastTrigger: HTMLElement | null = null;

/* ---------- mapa ---------- */

const map = new IbovMap(
  mapHost,
  {
    onSelect: (stock) => openDrawer(stock),
    onFocus: (focus, labels) => renderCrumbs(focus, labels),
    onAnnounce: (message) => {
      live.textContent = message;
    },
  },
  t,
  f
);

map.setSizeBy(prefs.sizeBy);
map.setGroupBy(prefs.groupBy);
map.setData(snapshot.stocks);

function renderCrumbs(focus: Focus, labels: { group: string | null; ticker: string | null }): void {
  const parts: string[] = [
    `<button type="button" data-crumb="root"${focus.level === 'root' ? ' aria-current="true"' : ''}>${t.root}</button>`,
  ];
  if (labels.group) {
    parts.push('<span aria-hidden="true">›</span>');
    parts.push(
      focus.level === 'group'
        ? `<span aria-current="true">${labels.group}</span>`
        : `<button type="button" data-crumb="group">${labels.group}</button>`
    );
  }
  if (labels.ticker) {
    parts.push('<span aria-hidden="true">›</span>');
    parts.push(`<span aria-current="true">${labels.ticker}</span>`);
  }
  const hint = focus.level === 'root' ? t.hintRoot : t.hintDeep;
  crumbs.innerHTML = `${parts.join(' ')}<span class="crumbs__hint">${hint}</span>`;
}

crumbs.addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-crumb]');
  if (!btn) return;
  const focus = map.currentFocus;
  if (btn.dataset.crumb === 'root') map.setFocus({ level: 'root' });
  else if (focus.level === 'leaf' && focus.group) map.setFocus({ level: 'group', group: focus.group });
});

/* ---------- linha de controles ---------- */

function pressGroup(groupRole: string, attr: string, value: string): void {
  const group = $(groupRole);
  if (!group) return;
  for (const b of group.querySelectorAll<HTMLButtonElement>('button')) {
    b.setAttribute('aria-pressed', b.dataset[attr] === value ? 'true' : 'false');
  }
}

$('size-group')!.addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-size-by]');
  if (!btn) return;
  prefs.sizeBy = btn.dataset.sizeBy as SizeBy;
  savePrefs();
  pressGroup('size-group', 'sizeBy', prefs.sizeBy);
  map.setSizeBy(prefs.sizeBy);
  const legend = $('legend-size');
  if (legend) legend.textContent = map.sizeLabel;
  live.textContent = fill(t.liveSize, { label: map.sizeLabel });
});

const groupSelect = $<HTMLSelectElement>('group-by')!;
groupSelect.value = prefs.groupBy;
groupSelect.addEventListener('change', () => {
  prefs.groupBy = groupSelect.value as GroupBy;
  savePrefs();
  map.setGroupBy(prefs.groupBy);
  renderCrumbs(map.currentFocus, { group: null, ticker: null });
});

const search = $<HTMLInputElement>('search')!;
let searchTimer = 0;
search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    map.setQuery(search.value);
    const hits = map.matches();
    if (search.value.trim()) {
      live.textContent = fill(t.liveMatches, { n: hits.length, query: search.value.trim() });
    }
  }, 140);
});
search.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  ev.preventDefault();
  map.setQuery(search.value);
  const hits = map.matches();
  if (hits.length) map.focusTicker(hits[0]!.ticker);
});

const viewToggle = $<HTMLButtonElement>('view-toggle')!;
function applyTableState(): void {
  tableView.hidden = !prefs.tableOpen;
  viewToggle.setAttribute('aria-pressed', String(prefs.tableOpen));
  viewToggle.textContent = prefs.tableOpen ? t.hideTable : t.showTable;
}
viewToggle.addEventListener('click', () => {
  prefs.tableOpen = !prefs.tableOpen;
  savePrefs();
  applyTableState();
  if (prefs.tableOpen) tableView.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
applyTableState();

$('palette-group')!.addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-palette]');
  if (!btn) return;
  prefs.palette = btn.dataset.palette as Prefs['palette'];
  savePrefs();
  if (prefs.palette === 'classic') document.documentElement.dataset.palette = 'classic';
  else delete document.documentElement.dataset.palette;
  pressGroup('palette-group', 'palette', prefs.palette);
});

$('theme-group')!.addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-theme]');
  if (!btn) return;
  prefs.theme = btn.dataset.theme as Prefs['theme'];
  savePrefs();
  if (prefs.theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = prefs.theme;
  pressGroup('theme-group', 'theme', prefs.theme);
});

const texture = $<HTMLInputElement>('texture')!;
texture.checked = prefs.texture;
texture.addEventListener('change', () => {
  prefs.texture = texture.checked;
  savePrefs();
  if (prefs.texture) document.documentElement.dataset.texture = 'on';
  else delete document.documentElement.dataset.texture;
});

pressGroup('size-group', 'sizeBy', prefs.sizeBy);
pressGroup('palette-group', 'palette', prefs.palette);
pressGroup('theme-group', 'theme', prefs.theme);
const legendSize = $('legend-size');
if (legendSize) legendSize.textContent = map.sizeLabel;

/* ---------- atualização dos dados ---------- */

const refreshBtn = $<HTMLButtonElement>('refresh')!;

async function refresh(manual = false): Promise<void> {
  mapHost.dataset.pending = 'true';
  refreshBtn.disabled = true;
  try {
    const res = await fetch(`/api/snapshot.json?lang=${encodeURIComponent(locale)}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    snapshot = (await res.json()) as Snapshot;
    map.setData(snapshot.stocks);
    paintTotals();
    paintTable();
    if (manual) live.textContent = fill(t.liveUpdated, { when: f.dateTime(snapshot.fetchedAt) });
  } catch {
    live.textContent = t.liveUpdateFail;
  } finally {
    mapHost.dataset.pending = 'false';
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', () => refresh(true));

// 60 s é o TTL do cache no servidor; pausamos com a aba em segundo plano.
window.setInterval(() => {
  if (document.visibilityState === 'visible') void refresh();
}, 60_000);

function paintTotals(): void {
  const totals = snapshot.totals;
  const index = snapshot.index;
  const headline = index?.changePct ?? totals.weightedChangePct;
  const weighted = $('weighted');
  if (weighted) {
    weighted.textContent = f.pct(headline);
    weighted.classList.toggle('up', (headline ?? 0) > 0);
    weighted.classList.toggle('down', (headline ?? 0) < 0);
  }
  const label = $('headline-label');
  if (label) label.textContent = index ? t.indexLabel : t.weighted;
  const note = $('headline-note');
  if (note) {
    note.textContent = index
      ? fill(t.indexNote, { points: f.int(index.price), previous: f.int(index.previousClose) })
      : t.weightedNote;
  }
  const total = Math.max(1, totals.up + totals.down + totals.flat);
  const seg = (role: string, n: number) => {
    const el = $(role);
    if (el) el.style.width = `${(n / total) * 100}%`;
  };
  seg('breadth-up', totals.up);
  seg('breadth-flat', totals.flat);
  seg('breadth-down', totals.down);
  const up = $('count-up');
  const down = $('count-down');
  if (up) up.textContent = String(totals.up);
  if (down) down.textContent = String(totals.down);
}

function paintTable(): void {
  const body = $('table-body');
  if (!body) return;
  body.innerHTML = snapshot.stocks
    .map((s) => {
      const cls = s.changePct == null ? '' : s.changePct > 0 ? 'up' : s.changePct < 0 ? 'down' : '';
      return `<tr><th scope="row" class="cell-ticker">${s.ticker}</th><td>${s.name}</td><td>${s.sector}</td>` +
        `<td>${f.weight(s.weight)}</td><td>${f.price(s.price)}</td><td class="${cls}">${f.pct(s.changePct)}</td>` +
        `<td>${f.compact(s.marketCap)}</td><td>${f.int(s.volume)}</td></tr>`;
    })
    .join('');
}

/* ---------- gaveta de detalhe ---------- */

const dTicker = $('d-ticker')!;
const dName = $('d-name')!;
const dStats = $('d-stats')!;
const dChart = $('d-chart')!;
const dTip = $('d-tip')!;
const dSeries = $('d-series')!;
const dRange = $('d-range')!;
const dReturns = $('d-returns')!;
const dChartTitle = $('d-chart-title')!;
const dChartNote = $('d-chart-note')!;

function kv(k: string, v: string, cls = ''): string {
  return `<div class="kv"><div class="kv__k">${k}</div><div class="kv__v ${cls}">${v}</div></div>`;
}

function openDrawer(stock: Stock): void {
  currentTicker = stock.ticker;
  lastTrigger = document.activeElement as HTMLElement;
  drawer.dataset.open = 'true';
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.dataset.open = 'true';
  dTicker.textContent = stock.ticker;
  // O subsetor só existe em português na origem; marcamos o idioma em vez de
  // traduzir no chute, para o leitor de tela pronunciar certo.
  const sub = stock.subsector
    ? ` / <span${locale === 'pt-BR' ? '' : ' lang="pt-BR"'}>${stock.subsector}</span>`
    : '';
  dName.innerHTML = `${stock.name} · ${stock.type} · ${stock.sector}${sub}`;
  dStats.innerHTML = baseStats(stock);
  dRange.innerHTML = '';
  dReturns.innerHTML = '';
  dChartTitle.textContent = fill(t.chartTitle, { ticker: stock.ticker });
  dChartNote.textContent = t.chartLoading;
  dSeries.innerHTML = '';
  drawer.focus();
  void loadDetail(stock.ticker);
}

function baseStats(stock: Stock): string {
  const trend = stock.changePct == null ? '' : stock.changePct > 0 ? 'up' : stock.changePct < 0 ? 'down' : '';
  return [
    kv(t.statPrice, f.price(stock.price)),
    kv(t.statChange, f.pct(stock.changePct), trend),
    kv(t.statWeight, f.weight(stock.weight)),
    kv(t.statMarketCap, f.compact(stock.marketCap)),
    kv(t.statVolume, f.int(stock.volume)),
    kv(t.statTurnover, f.compact(stock.turnover)),
  ].join('');
}

/** Volume do dia com a média de 30 pregões logo abaixo, para dar escala. */
function volumeStat(stock: Stock, detail: StockDetail): string {
  const volume = detail.volume ?? stock.volume;
  if (detail.avgVolume == null || !volume) return kv(t.statAvgVolume, f.int(detail.avgVolume));
  const ratio = (volume / detail.avgVolume) * 100;
  return `<div class="kv"><div class="kv__k">${t.statAvgVolume}</div>` +
    `<div class="kv__v">${f.int(detail.avgVolume)}</div>` +
    `<div class="kv__note">${fill(t.statVsAvg, { pct: `${Math.round(ratio)}%` })}</div></div>`;
}

/**
 * Faixa de 52 semanas como medidor: a posição do preço é a informação, e ela
 * aparece como marca sobre a trilha e também em texto na etiqueta.
 */
function rangeMeter(detail: StockDetail): string {
  const { fiftyTwoWeekLow: low, fiftyTwoWeekHigh: high, rangePosition: pos } = detail;
  if (low == null || high == null || pos == null) return '';
  const pct = Math.round(pos * 100);
  const aria = fill(t.range52Aria, { pct: `${pct}%`, low: f.price(low), high: f.price(high) });
  return `<div class="meter" role="img" aria-label="${aria}">
      <div class="meter__head"><span>${t.statRange52}</span><span class="meter__pct">${pct}%</span></div>
      <div class="meter__track"><span class="meter__fill" style="width:${pct}%"></span><span class="meter__mark" style="left:${pct}%"></span></div>
      <div class="meter__ends"><span>${f.price(low)}</span><span>${f.price(high)}</span></div>
    </div>`;
}

/** Retornos acumulados — números com sinal, cada um com seu rótulo de período. */
function returnsRow(detail: StockDetail): string {
  const keys: [ReturnKey, string][] = [
    ['1mo', t.ranges['1mo']!],
    ['3mo', t.ranges['3mo']!],
    ['6mo', t.ranges['6mo']!],
    ['1y', t.ranges['1y']!],
    ['ytd', t.returnYtd],
  ];
  const cells = keys
    .map(([key, label]) => {
      const value = detail.returns[key] ?? null;
      const cls = value == null ? '' : value > 0 ? 'up' : value < 0 ? 'down' : '';
      return `<div class="returns__cell"><div class="returns__k">${label}</div>` +
        `<div class="returns__v ${cls}">${f.pct(value, 1)}</div></div>`;
    })
    .join('');
  if (!keys.some(([key]) => detail.returns[key] != null)) return '';
  return `<div class="returns"><div class="stat__label">${t.statReturns}</div>` +
    `<div class="returns__row">${cells}</div></div>`;
}

async function loadDetail(ticker: string): Promise<void> {
  const stock = snapshot.stocks.find((s) => s.ticker === ticker);
  try {
    const res = await fetch(`/api/ativo/${ticker}.json?range=${detailRange}`, {
      headers: { accept: 'application/json' },
    });
    const detail = (await res.json()) as StockDetail;
    if (currentTicker !== ticker) return; // o usuário já clicou em outro ativo

    if (stock) {
      dStats.innerHTML =
        baseStats(stock) +
        kv(t.statOpen, f.price(detail.open)) +
        kv(t.statDayRange, `${f.price(detail.dayLow)} – ${f.price(detail.dayHigh)}`) +
        volumeStat(stock, detail);
    }
    dRange.innerHTML = rangeMeter(detail);
    dReturns.innerHTML = returnsRow(detail);

    if (!detail.ok || detail.history.length < 2) {
      dChartNote.textContent = fill(t.chartUnavailable, { detail: detail.detail });
      dChart.querySelector('svg')?.remove();
      return;
    }

    renderChart(dChart, dTip, detail.history, t, f);
    const first = detail.history[0]!;
    const last = detail.history.at(-1)!;
    const variation = ((last.close - first.close) / first.close) * 100;
    dChartNote.textContent = fill(t.chartNote, {
      n: detail.history.length,
      from: f.date(first.date),
      to: f.date(last.date),
      variation: f.pct(variation),
      updated: f.dateTime(detail.updatedAt),
    });
    dSeries.innerHTML = detail.history
      .slice()
      .reverse()
      .map((p) => `<tr><th scope="row">${f.date(p.date)}</th><td>${f.price(p.close)}</td></tr>`)
      .join('');
  } catch (err) {
    // O painel mostra uma frase; o motivo fica no console para quem for depurar.
    console.error('[ibov] falha ao montar o detalhe', err);
    dChartNote.textContent = t.detailFail;
  }
}

$('range-group')!.addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-range]');
  if (!btn || !currentTicker) return;
  detailRange = btn.dataset.range!;
  pressGroup('range-group', 'range', detailRange);
  dChartNote.textContent = 'Carregando série histórica…';
  void loadDetail(currentTicker);
});

function closeDrawer(): void {
  drawer.dataset.open = 'false';
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.dataset.open = 'false';
  currentTicker = null;
  map.setSelected(null);
  dTip.dataset.open = 'false';
  lastTrigger?.focus?.();
}

$('drawer-close')!.addEventListener('click', closeDrawer);
backdrop.addEventListener('click', closeDrawer);

/* ---------- teclado ---------- */

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    if (drawer.dataset.open === 'true') {
      closeDrawer();
      return;
    }
    if (map.zoomOut()) ev.preventDefault();
    return;
  }
  if (ev.key === '/' && document.activeElement !== search) {
    ev.preventDefault();
    search.focus();
    search.select();
  }
});

paintTotals();
