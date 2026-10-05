// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

// O painel é server-rendered: as rotas /api/* buscam dados públicos (B3 + brapi)
// no servidor, com cache em memória. Isso evita CORS e repetir chamadas por visita.
// SITE_URL fixa a origem canônica em produção (ex.: https://ibov.exemplo.com.br).
// Sem ela, cada página usa a origem da própria requisição — o que mantém o
// desenvolvimento funcionando sem domínio inventado no HTML.
const site = process.env.SITE_URL || undefined;

// Na Vercel o build roda com VERCEL=1 e usa o adaptador serverless dela; fora
// dali continua o servidor Node standalone, que é o que `npm run preview` sobe.
const adapter = process.env.VERCEL ? vercel() : node({ mode: 'standalone' });

export default defineConfig({
  site,
  output: 'server',
  adapter,
  server: { port: 4321, host: true },
  devToolbar: { enabled: false },
});
