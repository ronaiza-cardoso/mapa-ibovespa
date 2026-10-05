/**
 * Cache em memória com TTL e "stale-while-error": se a origem falhar, devolvemos
 * o último valor bom em vez de derrubar a página. Uma instância do servidor
 * atende todas as visitas, então as APIs públicas são chamadas poucas vezes.
 */
interface Entry<T> {
  value: T;
  at: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.value;

  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;

  const task = load()
    .then((value) => {
      store.set(key, { value, at: Date.now() });
      return value;
    })
    .catch((err) => {
      if (hit) return hit.value; // mantém o último retrato bom
      throw err;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, task);
  return task;
}

export function peek<T>(key: string): T | undefined {
  return (store.get(key) as Entry<T> | undefined)?.value;
}

/** fetch com timeout e User-Agent — alguns endpoints públicos recusam agentes vazios. */
export async function getJSON(url: string, timeoutMs = 12_000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; painel-ibov/1.0; dados publicos)',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
