import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from 'd3-hierarchy';
import { fill, type Dict } from '../i18n';
import type { Fmt } from '../lib/format';
import type { Stock } from '../lib/types';
import { bandOf } from './palette';

export type SizeBy = 'weight' | 'marketCap' | 'turnover';
export type GroupBy = 'sector' | 'subsector' | 'none';

/** Foco atual do mapa: o índice todo, um agrupamento, ou um ativo. */
export type Focus =
  | { level: 'root' }
  | { level: 'group'; group: string }
  | { level: 'leaf'; group: string | null; ticker: string };

interface Datum {
  kind: 'root' | 'group' | 'leaf';
  key: string;
  label: string;
  stock?: Stock;
  children?: Datum[];
}

interface Rect { x: number; y: number; w: number; h: number }

const HEADER = 17;

/** Abaixo disso o setor vira uma tira ilegível; o rabo vai todo para "Outros". */
const MIN_GROUP_WEIGHT = 3;
const MAX_GROUPS = 9;


/**
 * Área mínima de um ladrilho, em px². Abaixo disso não cabe nem o ticker, e
 * caixa sem rótulo não serve para nada. O peso real continua no rótulo, no
 * tooltip e na tabela.
 */
const MIN_TILE_AREA = 1600;

/** Teto do piso: os ladrilhos no mínimo não podem passar disso do total. */
const FLOOR_SHARE = 0.42;

/** Largura média de um caractere do ticker, em múltiplos do tamanho da fonte. */
const CHAR_W = 0.62;

interface Label {
  /** Corpo do ticker, em px. */
  size: number;
  /** Quanto do rótulo cabe: só o ticker, ticker + variação, ou tudo. */
  parts: 'ticker' | 'delta' | 'full';
  /** Caixa alta e estreita lê melhor com o ticker de pé. */
  orient: 'h' | 'v';
  pad: number;
}

/** Dimensiona o rótulo para a caixa: o ticker sempre aparece, encolhendo se precisar. */
function fitLabel(w: number, h: number, ticker: string): Label {
  const pad = w < 34 || h < 20 ? 1 : w < 70 ? 2 : 4;
  const run = ticker.length * CHAR_W;
  const horizontal = Math.min(22, (w - pad * 2 - 1) / run, (h - pad * 2) * 0.82);
  const vertical = Math.min(22, (h - pad * 2 - 1) / run, (w - pad * 2) * 0.82);
  // Só vira o rótulo quando deitado ele ficaria miúdo e de pé cabe bem melhor.
  const upright = horizontal < 9 && vertical > horizontal + 1.5;
  const size = Math.max(6, upright ? vertical : horizontal);

  let parts: Label['parts'] = 'ticker';
  if (upright) {
    if (w >= size * 2.3 + pad * 2 && h >= 70) parts = 'delta';
  } else if (h >= size * 3.3 + pad * 2 && w >= 92) parts = 'full';
  else if (h >= size * 2.2 + pad * 2 && w >= 46) parts = 'delta';

  return { size: Math.round(size * 10) / 10, parts, orient: upright ? 'v' : 'h', pad };
}

export interface TreemapHandlers {
  onSelect(stock: Stock): void;
  onFocus(focus: Focus, labels: { group: string | null; ticker: string | null }): void;
  onAnnounce(message: string): void;
}

export class IbovMap {
  private host: HTMLElement;
  private handlers: TreemapHandlers;
  private t: Dict;
  private f: Fmt;
  /** Nome do grupo que recolhe os setores pequenos, no idioma da página. */
  private other: string;
  private stocks: Stock[] = [];
  private sizeBy: SizeBy = 'weight';
  private groupBy: GroupBy = 'sector';
  private query = '';
  private focus: Focus = { level: 'root' };
  private tiles = new Map<string, HTMLButtonElement>();
  private groups = new Map<string, HTMLDivElement>();
  private selected: string | null = null;
  private groupCache: Set<string> | null = null;

  constructor(host: HTMLElement, handlers: TreemapHandlers, t: Dict, f: Fmt) {
    this.host = host;
    this.handlers = handlers;
    this.t = t;
    this.f = f;
    this.other = t.otherSectors;

    host.addEventListener('click', (ev) => {
      const tile = (ev.target as HTMLElement).closest<HTMLElement>('[data-ticker]');
      if (tile) return this.onTileClick(tile.dataset.ticker!);
      const head = (ev.target as HTMLElement).closest<HTMLElement>('[data-group-key]');
      if (head) this.setFocus({ level: 'group', group: head.dataset.groupKey! });
    });

    const ro = new ResizeObserver(() => this.render());
    ro.observe(host);
  }

  /* ---------- entrada de dados e controles ---------- */

  setData(stocks: Stock[]): void {
    this.stocks = stocks;
    this.groupCache = null;
    // Se o ativo em foco saiu da carteira, voltamos para a raiz.
    const focus = this.focus;
    if (focus.level === 'leaf' && !stocks.some((s) => s.ticker === focus.ticker)) {
      this.focus = { level: 'root' };
    }
    this.render();
  }

  setSizeBy(sizeBy: SizeBy): void {
    this.sizeBy = sizeBy;
    this.render();
  }

  setGroupBy(groupBy: GroupBy): void {
    this.groupBy = groupBy;
    this.groupCache = null;
    // Agrupamento diferente invalida o grupo em foco.
    if (this.focus.level === 'group') this.focus = { level: 'root' };
    if (this.focus.level === 'leaf') this.focus = { level: 'leaf', group: null, ticker: this.focus.ticker };
    this.render();
  }

  setQuery(query: string): void {
    this.query = query.trim().toLowerCase();
    this.render();
  }

  /** Nome da métrica que define a área, para a legenda e para o leitor de tela. */
  get sizeLabel(): string {
    const byMetric: Record<SizeBy, string> = {
      weight: this.t.sizeWeight,
      marketCap: this.t.sizeMarketCap,
      turnover: this.t.sizeTurnover,
    };
    return byMetric[this.sizeBy].toLowerCase();
  }

  matches(): Stock[] {
    if (!this.query) return [];
    return this.stocks.filter((s) => this.isMatch(s));
  }

  /* ---------- navegação ---------- */

  setFocus(focus: Focus): void {
    this.focus = focus;
    this.render();
    const labels = this.focusLabels();
    this.handlers.onFocus(focus, labels);
    this.handlers.onAnnounce(
      focus.level === 'root'
        ? fill(this.t.liveRoot, { n: this.stocks.length })
        : focus.level === 'group'
          ? fill(this.t.liveGroup, { group: labels.group ?? '' })
          : fill(this.t.liveLeaf, { ticker: labels.ticker ?? '' })
    );
  }

  focusTicker(ticker: string, openDetail = true): void {
    const stock = this.stocks.find((s) => s.ticker === ticker);
    if (!stock) return;
    this.setFocus({ level: 'leaf', group: this.groupKey(stock), ticker });
    if (openDetail) {
      this.selected = ticker;
      this.handlers.onSelect(stock);
    }
  }

  zoomOut(): boolean {
    if (this.focus.level === 'leaf') {
      const group = this.focus.group;
      this.setFocus(group ? { level: 'group', group } : { level: 'root' });
      return true;
    }
    if (this.focus.level === 'group') {
      this.setFocus({ level: 'root' });
      return true;
    }
    return false;
  }

  get currentFocus(): Focus {
    return this.focus;
  }

  setSelected(ticker: string | null): void {
    this.selected = ticker;
    for (const [key, el] of this.tiles) el.setAttribute('aria-pressed', key === ticker ? 'true' : 'false');
  }

  /* ---------- internos ---------- */

  private onTileClick(ticker: string): void {
    const stock = this.stocks.find((s) => s.ticker === ticker);
    if (!stock) return;
    const group = this.groupKey(stock);
    this.selected = ticker;
    this.handlers.onSelect(stock);
    // Um clique = um nível de zoom: raiz -> grupo -> ativo.
    if (this.focus.level === 'root' && group) this.setFocus({ level: 'group', group });
    else this.setFocus({ level: 'leaf', group, ticker });
    this.setSelected(ticker);
  }

  /** Nome do grupo que de fato aparece no mapa (já considerando o "Outros"). */
  private groupKey(stock: Stock): string | null {
    if (this.groupBy === 'none') return null;
    const raw = (this.groupBy === 'sector' ? stock.sector : stock.subsector || stock.sector) || 'Outros';
    return this.visibleGroups().has(raw) ? raw : this.other;
  }

  /** Grupos que sobreviveram ao corte, calculados uma vez por conjunto de dados. */
  private visibleGroups(): Set<string> {
    if (this.groupCache) return this.groupCache;
    const weights = new Map<string, number>();
    for (const s of this.stocks) {
      const raw = (this.groupBy === 'sector' ? s.sector : s.subsector || s.sector) || 'Outros';
      weights.set(raw, (weights.get(raw) ?? 0) + s.weight);
    }
    const ranked = [...weights].sort((a, b) => b[1] - a[1]);
    const keep = ranked.filter(([, w], i) => w >= MIN_GROUP_WEIGHT && i < MAX_GROUPS);
    const tail = ranked.filter((g) => !keep.includes(g));
    if (tail.length === 1) keep.push(tail[0]!);
    this.groupCache = new Set(keep.map(([key]) => key));
    return this.groupCache;
  }

  private isMatch(stock: Stock): boolean {
    if (!this.query) return true;
    const q = this.query;
    return (
      stock.ticker.toLowerCase().includes(q) ||
      stock.name.toLowerCase().includes(q) ||
      stock.asset.toLowerCase().includes(q) ||
      stock.sector.toLowerCase().includes(q) ||
      stock.subsector.toLowerCase().includes(q)
    );
  }

  private metric(stock: Stock): number {
    const raw =
      this.sizeBy === 'weight' ? stock.weight : this.sizeBy === 'marketCap' ? stock.marketCap : stock.turnover;
    if (raw != null && raw > 0) return raw;
    // Sem o dado da métrica, estimamos pelo peso para a área não desaparecer.
    return stock.weight * this.scaleFromWeight();
  }

  private scaleFromWeight(): number {
    if (this.sizeBy === 'weight') return 1;
    let metricSum = 0;
    let weightSum = 0;
    for (const s of this.stocks) {
      const v = this.sizeBy === 'marketCap' ? s.marketCap : s.turnover;
      if (v != null && v > 0) {
        metricSum += v;
        weightSum += s.weight;
      }
    }
    return weightSum > 0 ? metricSum / weightSum : 1;
  }

  private buildTree(): Datum {
    const leaves = this.stocks.map(
      (s): Datum => ({ kind: 'leaf', key: s.ticker, label: s.ticker, stock: s })
    );
    if (this.groupBy === 'none') return { kind: 'root', key: '__root', label: 'Ibovespa', children: leaves };

    const byGroup = new Map<string, Datum[]>();
    for (const leaf of leaves) {
      const key = this.groupKey(leaf.stock!)!;
      const bucket = byGroup.get(key);
      if (bucket) bucket.push(leaf);
      else byGroup.set(key, [leaf]);
    }

    // Os grupos pequenos demais viram tiras onde nem o nome cabe. Ordenamos por
    // peso e dobramos o rabo em "Outros setores" — que continua clicável.
    const ranked = [...byGroup]
      .map(([key, children]) => ({
        key,
        children,
        weight: children.reduce((acc, d) => acc + (d.stock?.weight ?? 0), 0),
      }))
      .sort((a, b) => b.weight - a.weight);

    const keep = ranked.filter((g, i) => g.weight >= MIN_GROUP_WEIGHT && i < MAX_GROUPS);
    const tail = ranked.filter((g) => !keep.includes(g));
    const groups = keep.map(
      (g): Datum => ({ kind: 'group', key: g.key, label: g.key, children: g.children })
    );
    // Dobrar um grupo só não simplifica nada: nesse caso ele fica como está.
    if (tail.length === 1) {
      groups.push({ kind: 'group', key: tail[0]!.key, label: tail[0]!.key, children: tail[0]!.children });
    } else if (tail.length > 1) {
      groups.push({
        kind: 'group',
        key: this.other,
        label: this.other,
        children: tail.flatMap((g) => g.children),
      });
    }

    return { kind: 'root', key: '__root', label: 'Ibovespa', children: groups };
  }

  private focusSubtree(): { datum: Datum; grouped: boolean } {
    const tree = this.buildTree();
    const focus = this.focus;
    if (focus.level === 'group') {
      const group = tree.children?.find((g) => g.key === focus.group);
      if (group) return { datum: { ...tree, children: group.children }, grouped: false };
      return { datum: tree, grouped: this.groupBy !== 'none' };
    }
    if (focus.level === 'leaf') {
      const ticker = focus.ticker;
      const stock = this.stocks.find((s) => s.ticker === ticker);
      if (stock) {
        return {
          datum: { ...tree, children: [{ kind: 'leaf', key: ticker, label: ticker, stock }] },
          grouped: false,
        };
      }
    }
    return { datum: tree, grouped: this.groupBy !== 'none' };
  }

  private focusLabels(): { group: string | null; ticker: string | null } {
    if (this.focus.level === 'group') return { group: this.focus.group, ticker: null };
    if (this.focus.level === 'leaf') return { group: this.focus.group, ticker: this.focus.ticker };
    return { group: null, ticker: null };
  }

  /* ---------- desenho ---------- */

  render(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h || !this.stocks.length) return;

    const { datum, grouped } = this.focusSubtree();
    const floor = this.areaFloor(datum, w, h, grouped);
    const root = hierarchy<Datum>(datum, (d) => d.children)
      .sum((d) => (d.kind === 'leaf' ? Math.max(this.metric(d.stock!), floor) : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    treemap<Datum>()
      .tile(treemapSquarify)
      .size([w, h])
      .paddingInner(2)
      .paddingOuter(2)
      .paddingTop((node) => (grouped && node.depth === 1 ? HEADER : 2))
      .round(true)(root);

    const full: Rect = { x: 0, y: 0, w, h };
    const seenTiles = new Set<string>();
    const seenGroups = new Set<string>();

    for (const node of root.descendants() as HierarchyRectangularNode<Datum>[]) {
      const rect: Rect = {
        x: node.x0,
        y: node.y0,
        w: Math.max(0, node.x1 - node.x0),
        h: Math.max(0, node.y1 - node.y0),
      };
      if (node.data.kind === 'leaf') {
        seenTiles.add(node.data.key);
        this.paintTile(node, rect);
      } else if (node.data.kind === 'group' && grouped) {
        seenGroups.add(node.data.key);
        this.paintGroup(node, rect);
      }
    }

    // Quem saiu do foco voa para fora e desaparece — é isso que dá a leitura de zoom.
    for (const [key, el] of this.tiles) {
      if (seenTiles.has(key)) continue;
      el.dataset.hidden = 'true';
      el.setAttribute('tabindex', '-1');
      el.setAttribute('aria-hidden', 'true');
      place(el, full);
    }
    for (const [key, el] of this.groups) {
      if (seenGroups.has(key)) continue;
      el.dataset.hidden = 'true';
      place(el, full);
    }
  }

  /**
   * Valor mínimo por ativo para que o menor ladrilho ainda tenha MIN_TILE_AREA.
   * Resolve por iteração: elevar os menores aumenta o total, que por sua vez
   * eleva o piso. O teto evita que uma tela estreita achate tudo num mapa
   * uniforme — aí os rótulos é que encolhem.
   */
  private areaFloor(datum: Datum, w: number, h: number, grouped: boolean): number {
    const values: number[] = [];
    const walk = (d: Datum) => {
      if (d.kind === 'leaf') values.push(Math.max(this.metric(d.stock!), 0));
      else d.children?.forEach(walk);
    };
    walk(datum);
    if (values.length < 2) return 0;

    // Desconta o que os vãos e os cabeçalhos comem da área útil.
    const usable = Math.max(1, (w - 4) * (h - 4) * (grouped ? 0.84 : 0.95));
    let floor = 0;
    for (let i = 0; i < 6; i++) {
      const total = values.reduce((acc, v) => acc + Math.max(v, floor), 0);
      const wanted = (total * MIN_TILE_AREA) / usable;
      const ceiling = (FLOOR_SHARE * total) / values.length;
      const next = Math.min(wanted, ceiling);
      if (Math.abs(next - floor) < 1e-6) break;
      floor = next;
    }
    return floor;
  }

  private paintTile(node: HierarchyRectangularNode<Datum>, rect: Rect): void {
    const stock = node.data.stock!;
    const key = stock.ticker;
    let el = this.tiles.get(key);

    if (!el) {
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'tile';
      el.dataset.ticker = key;
      el.innerHTML =
        '<span class="tile__ticker"></span><span class="tile__delta"></span><span class="tile__meta"></span>';
      this.tiles.set(key, el);
      this.host.append(el);
    }
    // A posição é sempre a do layout atual: nada de agendar o place para o
    // próximo quadro, senão um segundo render (resize) chega antes e o
    // agendamento antigo devolve o ladrilho para o lugar errado.
    place(el, rect);

    const band = bandOf(stock.changePct);
    const label = fitLabel(rect.w, rect.h, key);
    el.dataset.band = band;
    el.dataset.parts = label.parts;
    el.dataset.orient = label.orient;
    el.style.setProperty('--tile-fs', `${label.size}px`);
    el.style.setProperty('--tile-pad', `${label.pad}px`);
    el.dataset.hidden = 'false';
    el.dataset.dim = this.query && !this.isMatch(stock) ? 'true' : 'false';
    el.removeAttribute('aria-hidden');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-pressed', this.selected === key ? 'true' : 'false');

    const metricText =
      this.sizeBy === 'weight'
        ? fill(this.t.ofIndex, { w: this.f.weight(stock.weight) })
        : this.sizeBy === 'marketCap'
          ? this.f.compact(stock.marketCap)
          : this.f.compact(stock.turnover);

    el.querySelector('.tile__ticker')!.textContent = key;
    el.querySelector('.tile__delta')!.textContent = this.f.pct(stock.changePct);
    el.querySelector('.tile__meta')!.textContent = metricText;
    el.setAttribute(
      'aria-label',
      fill(this.t.tileAria, {
        ticker: key,
        name: stock.name,
        change: this.f.pct(stock.changePct),
        price: this.f.price(stock.price),
        weight: this.f.weight(stock.weight),
        sector: stock.sector,
      })
    );
    el.title = `${key} — ${stock.name}\n${this.f.pct(stock.changePct)} · ${this.f.price(stock.price)}\n${metricText}`;
  }

  private paintGroup(node: HierarchyRectangularNode<Datum>, rect: Rect): void {
    const key = node.data.key;
    let el = this.groups.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'group';
      el.innerHTML = '<button type="button" class="group__head"></button>';
      el.querySelector('button')!.dataset.groupKey = key;
      this.groups.set(key, el);
      this.host.prepend(el);
    }
    el.dataset.hidden = 'false';
    place(el, rect);

    const leaves = node.leaves().map((l) => l.data.stock!).filter(Boolean);
    const weight = leaves.reduce((acc, s) => acc + s.weight, 0);
    // O número do cabeçalho acompanha a métrica que define a área.
    const total =
      this.sizeBy === 'weight'
        ? this.f.weight(weight)
        : this.f.compact(leaves.reduce((acc, s) => acc + this.metric(s), 0));
    const head = el.querySelector<HTMLButtonElement>('.group__head')!;
    // O nome trunca com reticências; o número some antes de o nome ficar ilegível.
    // Agrupado por subsetor, o nome vem em português da origem mesmo na página
    // em inglês — marcamos o idioma do trecho.
    const foreign = this.groupBy === 'subsector' && this.t.code !== 'pt-BR';
    head.innerHTML =
      `<b${foreign ? ' lang="pt-BR"' : ''}>${key}</b>${rect.w >= 150 ? `<span>${total}</span>` : ''}`;
    head.style.visibility = rect.w < 56 || rect.h < HEADER + 6 ? 'hidden' : 'visible';
    head.setAttribute(
      'aria-label',
      fill(this.t.groupAria, {
        group: key,
        n: leaves.length,
        weight: this.f.weight(weight),
        metricLabel: this.sizeLabel,
        metric: total,
      })
    );
  }
}

function place(el: HTMLElement, rect: Rect): void {
  el.style.left = `${rect.x}px`;
  el.style.top = `${rect.y}px`;
  el.style.width = `${rect.w}px`;
  el.style.height = `${rect.h}px`;
}
