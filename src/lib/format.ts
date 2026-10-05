import type { Locale } from '../i18n';

/**
 * Formatadores por idioma. São criados uma vez por locale e reaproveitados —
 * nada de estado mutável global, que em SSR vazaria entre requisições.
 */
export interface Fmt {
  price(v: number | null | undefined): string;
  pct(v: number | null | undefined, digits?: number): string;
  weight(v: number | null | undefined): string;
  int(v: number | null | undefined): string;
  compact(v: number | null | undefined): string;
  dateTime(iso: string | null | undefined): string;
  date(iso: string | null | undefined): string;
}

/** Sufixos de escala curta — a moeda é sempre BRL, o índice é brasileiro. */
const SCALE: Record<Locale, [string, string, string]> = {
  'pt-BR': ['tri', 'bi', 'mi'],
  en: ['T', 'B', 'M'],
};

const cache = new Map<Locale, Fmt>();

export function formatters(locale: Locale): Fmt {
  const hit = cache.get(locale);
  if (hit) return hit;

  const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, opts);
  const money = nf({ style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  const num2 = nf({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num1 = nf({ minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const int = nf({ maximumFractionDigits: 0 });
  const [tri, bi, mi] = SCALE[locale];
  const thousand = locale === 'en' ? 'K' : 'mil';

  const fmt: Fmt = {
    price: (v) => (v == null ? '—' : money.format(v)),
    // O sinal é explícito: a cor nunca carrega a polaridade sozinha.
    pct: (v, digits = 2) =>
      v == null
        ? '—'
        : `${v > 0 ? '+' : v < 0 ? '−' : ''}${(digits === 1 ? num1 : num2).format(Math.abs(v))}%`,
    weight: (v) => (v == null ? '—' : `${num2.format(v)}%`),
    int: (v) => (v == null ? '—' : int.format(v)),
    compact: (v) => {
      if (v == null) return '—';
      const abs = Math.abs(v);
      const sign = v < 0 ? '−' : '';
      const unit = (value: number, suffix: string) => `${sign}R$ ${num2.format(value)} ${suffix}`;
      if (abs >= 1e12) return unit(abs / 1e12, tri);
      if (abs >= 1e9) return unit(abs / 1e9, bi);
      if (abs >= 1e6) return `${sign}R$ ${num1.format(abs / 1e6)} ${mi}`;
      if (abs >= 1e3) return `${sign}R$ ${num1.format(abs / 1e3)} ${thousand}`;
      return `${sign}R$ ${num2.format(abs)}`;
    },
    dateTime: (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleString(locale, {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    },
    date: (iso) => {
      if (!iso) return '—';
      const [y, m, d] = iso.slice(0, 10).split('-');
      if (!y || !m || !d) return '—';
      return locale === 'en' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
    },
  };

  cache.set(locale, fmt);
  return fmt;
}
