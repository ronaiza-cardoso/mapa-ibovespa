/** Tipos compartilhados entre servidor e cliente. */

export interface IndexMember {
  /** Código de negociação, ex. "PETR4". */
  ticker: string;
  /** Nome do ativo como publicado pela B3, ex. "PETROBRAS". */
  asset: string;
  /** Especificação do papel, ex. "PN N2". */
  type: string;
  /** Participação oficial no índice, em % (carteira teórica do dia). */
  weight: number;
  /** Quantidade teórica de ações no índice. */
  theoreticalQty: number;
}

export interface Stock extends IndexMember {
  name: string;
  sector: string;
  subsector: string;
  /** Último preço negociado, em BRL. */
  price: number | null;
  /** Variação do dia, em %. */
  changePct: number | null;
  /** Valor de mercado, em BRL. */
  marketCap: number | null;
  /** Volume do dia, em ações. */
  volume: number | null;
  /** Volume financeiro estimado do dia (volume x preço), em BRL. */
  turnover: number | null;
  logo: string | null;
}

export interface Snapshot {
  /** Data da carteira teórica, ISO (AAAA-MM-DD). */
  portfolioDate: string;
  /** Momento em que este retrato foi montado, ISO. */
  fetchedAt: string;
  stocks: Stock[];
  totals: {
    members: number;
    up: number;
    down: number;
    flat: number;
    /** Variação ponderada pelos pesos oficiais, em % — proxy do índice. */
    weightedChangePct: number | null;
    /** Soma dos pesos cobertos pela cotação, em %. */
    coveredWeight: number;
  };
  /** Cotação oficial do índice em pontos; null quando a origem não respondeu. */
  index: IndexPoint | null;
  sources: SourceStatus[];
  /** true quando algum dado veio do retrato local de contingência. */
  degraded: boolean;
}

export interface IndexPoint {
  price: number;
  changePct: number | null;
  previousClose: number | null;
  updatedAt: string | null;
}

export interface SourceStatus {
  name: string;
  url: string;
  ok: boolean;
  detail: string;
}

export interface HistoryPoint {
  /** Data ISO (AAAA-MM-DD). */
  date: string;
  close: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

/** Janelas de retorno acumulado calculadas sobre a série de um ano. */
export type ReturnKey = '1mo' | '3mo' | '6mo' | '1y' | 'ytd';

export interface StockDetail {
  ticker: string;
  name: string;
  price: number | null;
  changePct: number | null;
  change: number | null;
  previousClose: number | null;
  open: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  /** Onde o preço está dentro da faixa de 52 semanas, de 0 a 1. */
  rangePosition: number | null;
  volume: number | null;
  /** Média de volume dos últimos 30 pregões, para dar escala ao volume do dia. */
  avgVolume: number | null;
  currency: string;
  updatedAt: string | null;
  range: string;
  /** Retorno acumulado por janela, em %. */
  returns: Partial<Record<ReturnKey, number | null>>;
  history: HistoryPoint[];
  ok: boolean;
  detail: string;
}
