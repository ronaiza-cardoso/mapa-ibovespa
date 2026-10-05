/**
 * Escala divergente da variação do dia: três degraus por braço mais o cinza
 * neutro no meio (7 classes). O valor da faixa vira `data-band` no elemento e o
 * CSS resolve a cor e a tinta — nada de hex no JavaScript.
 */
export type Band = 'up-3' | 'up-2' | 'up-1' | 'neutral' | 'down-1' | 'down-2' | 'down-3' | 'nodata';

const CUTS = [0.25, 1, 2.5] as const;

export function bandOf(changePct: number | null | undefined): Band {
  if (changePct == null || !Number.isFinite(changePct)) return 'nodata';
  const abs = Math.abs(changePct);
  if (abs < CUTS[0]) return 'neutral';
  const step = abs >= CUTS[2] ? 3 : abs >= CUTS[1] ? 2 : 1;
  return `${changePct > 0 ? 'up' : 'down'}-${step}` as Band;
}
