import { fill, type Dict } from '../i18n';
import type { Fmt } from '../lib/format';
import type { HistoryPoint } from '../lib/types';

/**
 * Série única de fechamento: linha de 2px, grade em fio de cabelo, rótulos
 * diretos apenas no mínimo, no máximo e no último ponto, e camada de hover com
 * mira + tooltip. Sem legenda — uma série só, nomeada no título.
 */
const W = 420;
const H = 170;
const PAD = { top: 14, right: 46, bottom: 20, left: 8 };

export function renderChart(
  host: HTMLElement,
  tip: HTMLElement,
  points: HistoryPoint[],
  t: Dict,
  f: Fmt
): void {
  host.querySelector('svg')?.remove();
  if (points.length < 2) {
    tip.dataset.open = 'false';
    return;
  }

  const closes = points.map((p) => p.close);
  const lo = Math.min(...closes);
  const hi = Math.max(...closes);
  const span = hi - lo || Math.abs(hi) || 1;
  const yLo = lo - span * 0.08;
  const yHi = hi + span * 0.08;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (plotW * i) / (points.length - 1);
  const y = (v: number) => PAD.top + plotH - (plotH * (v - yLo)) / (yHi - yLo);

  const svgNS = 'http://www.w3.org/2000/svg';
  const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
    const node = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    return node;
  };

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', preserveAspectRatio: 'none' });
  svg.setAttribute(
    'aria-label',
    fill(t.chartAria, {
      from: f.date(points[0]!.date),
      to: f.date(points.at(-1)!.date),
      min: f.price(lo),
      max: f.price(hi),
      last: f.price(points.at(-1)!.close),
    })
  );

  // grade: três linhas horizontais, sólidas e discretas
  const grid = el('g', { class: 'chart__grid' });
  const ticks = [yLo + (yHi - yLo) * 0.15, (yLo + yHi) / 2, yHi - (yHi - yLo) * 0.15];
  for (const value of ticks) {
    grid.append(el('line', { x1: PAD.left, x2: PAD.left + plotW, y1: y(value), y2: y(value) }));
    const label = el('text', { x: PAD.left + plotW + 6, y: y(value) + 3, class: 'chart__tick chart__tick--y' });
    label.setAttribute('text-anchor', 'start');
    label.textContent = f.price(value).replace('R$ ', '');
    grid.append(label);
  }
  svg.append(grid);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.close).toFixed(1)}`).join(' ');
  svg.append(el('path', {
    d: `${line} L${x(points.length - 1).toFixed(1)} ${PAD.top + plotH} L${PAD.left} ${PAD.top + plotH} Z`,
    class: 'chart__area',
  }));
  svg.append(el('path', { d: line, class: 'chart__line' }));

  // rótulos diretos: só os pontos que importam
  const mark = (i: number, text: string, anchor: string) => {
    const node = el('text', { x: x(i), y: y(points[i]!.close) - 7, class: 'chart__label' });
    node.setAttribute('text-anchor', anchor);
    node.textContent = text;
    svg.append(node);
  };
  const iLo = closes.indexOf(lo);
  const iHi = closes.indexOf(hi);
  mark(iHi, `${t.chartMax} ${f.price(hi)}`, iHi > points.length * 0.8 ? 'end' : 'middle');
  const loText = el('text', { x: x(iLo), y: y(lo) + 14, class: 'chart__label' });
  loText.setAttribute('text-anchor', iLo > points.length * 0.8 ? 'end' : 'middle');
  loText.textContent = `${t.chartMin} ${f.price(lo)}`;
  svg.append(loText);

  const last = points.length - 1;
  svg.append(el('circle', { cx: x(last), cy: y(points[last]!.close), r: 4, class: 'chart__dot' }));

  // eixo de datas
  const axis = el('g', { class: 'chart__axis' });
  axis.append(el('line', { x1: PAD.left, x2: PAD.left + plotW, y1: PAD.top + plotH, y2: PAD.top + plotH }));
  for (const i of [0, Math.floor(last / 2), last]) {
    const node = el('text', { x: x(i), y: H - 6, class: 'chart__tick' });
    node.setAttribute('text-anchor', i === 0 ? 'start' : i === last ? 'end' : 'middle');
    node.textContent = f.date(points[i]!.date).slice(0, 5);
    axis.append(node);
  }
  svg.append(axis);

  const cross = el('line', { class: 'chart__cross', y1: PAD.top, y2: PAD.top + plotH, x1: 0, x2: 0 });
  cross.setAttribute('visibility', 'hidden');
  const hoverDot = el('circle', { r: 4.5, class: 'chart__dot', cx: 0, cy: 0 });
  hoverDot.setAttribute('visibility', 'hidden');
  svg.append(cross, hoverDot);

  host.prepend(svg);

  // camada de hover: alvo é a faixa inteira, não o ponto — e o teclado mostra o mesmo
  const move = (clientX: number) => {
    const box = svg.getBoundingClientRect();
    const rel = ((clientX - box.left) / box.width) * W;
    const i = Math.max(0, Math.min(last, Math.round(((rel - PAD.left) / plotW) * last)));
    const p = points[i]!;
    cross.setAttribute('visibility', 'visible');
    cross.setAttribute('x1', String(x(i)));
    cross.setAttribute('x2', String(x(i)));
    hoverDot.setAttribute('visibility', 'visible');
    hoverDot.setAttribute('cx', String(x(i)));
    hoverDot.setAttribute('cy', String(y(p.close)));
    tip.dataset.open = 'true';
    tip.innerHTML = `<div class="tooltip__t">${f.date(p.date)}</div><div class="tooltip__v">${f.price(p.close)}</div>`;
    tip.style.left = `${(x(i) / W) * 100}%`;
    tip.style.top = `${(y(p.close) / H) * 100}%`;
  };

  svg.addEventListener('pointermove', (ev) => move(ev.clientX));
  svg.addEventListener('pointerleave', () => {
    tip.dataset.open = 'false';
    cross.setAttribute('visibility', 'hidden');
    hoverDot.setAttribute('visibility', 'hidden');
  });
}
