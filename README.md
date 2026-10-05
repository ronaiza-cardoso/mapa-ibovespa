# Mapa do Ibovespa

Painel interativo, em Astro, das ações que compõem o Ibovespa. O estado inicial é
um **mapa de áreas (treemap)**: cada ação é um retângulo com área proporcional ao
peso no índice e cor pela variação do dia. Um clique dá zoom — primeiro no setor,
depois no ativo — e abre a gaveta de detalhe com a série histórica.

Só usa **dados públicos, sem cadastro e sem token**.

## Rodando

```bash
npm install
npm run dev     # http://localhost:4321
```

Para produção (o painel é server-rendered, adaptador Node standalone):

```bash
npm run build
npm run preview   # node ./dist/server/entry.mjs
```

| Script | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | compila cliente e servidor em `dist/` |
| `npm run preview` | sobe o build (`node ./dist/server/entry.mjs`) |
| `npm run snapshot` | regrava `src/data/fallback.json`, o retrato de contingência |
| `npm run images` | regera o cartão de compartilhamento e os ícones |

## Origem dos dados

| Dado | Origem | Endpoint |
| --- | --- | --- |
| Quem está no índice, peso oficial, quantidade teórica | B3 — carteira teórica do dia | `sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/<params em base64>` |
| Preço, variação do dia, valor de mercado, volume, setor | brapi.dev | `brapi.dev/api/quote/list?limit=1000` |
| Ibovespa em pontos | Yahoo Finance | `query1.finance.yahoo.com/v8/finance/chart/^BVSP` |
| Série histórica, abertura, mín/máx do dia e de 52 semanas | Yahoo Finance | `query1.finance.yahoo.com/v8/finance/chart/{TICKER}.SA` |

Detalhes que valem saber:

- **Sem token em nenhuma delas.** A `/quote/list` da brapi devolve o mercado
  inteiro numa chamada; já a `/quote/{ticker}` passou a responder **401** sem
  token, então o histórico e o detalhe migraram para o endpoint de gráfico do
  Yahoo Finance.
- **Uma série serve a quase tudo.** O detalhe busca um ano de fechamentos
  diários e dele tira o gráfico de 1, 3 e 6 meses (fatiando), os retornos
  acumulados e a média de volume. Só a janela de 5 anos pede uma segunda
  chamada, semanal.
- **`chartPreviousClose` é uma armadilha**: é o fechamento anterior à *janela*
  pedida, não ao pregão. Usá-lo como "fechamento de ontem" dá variação com o
  sinal trocado. O painel tira o fechamento anterior do penúltimo ponto da série.
- **Cache no servidor** (`src/lib/cache.ts`): 30 min para a carteira da B3, 60 s
  para as cotações, 5 min para as séries. Se a origem cair, o último valor bom
  continua sendo servido em vez de a página quebrar.
- **Contingência**: se uma das origens falhar e não houver nada em cache, o painel
  usa `src/data/fallback.json` e mostra um aviso de dados degradados.
- O número grande do topo é o **Ibovespa oficial em pontos**. Se o Yahoo não
  responder, ele cai para a *variação ponderada* calculada aqui pelos pesos da
  B3, e o rótulo muda para dizer isso.
- **P/L e LPA saíram do painel**: eram a única informação que vinha da rota agora
  autenticada da brapi, e não há fonte pública equivalente. Melhor um painel sem
  o campo do que um campo com travessão fixo.

## Idiomas

| Rota | Idioma |
| --- | --- |
| `/` | português |
| `/en` | inglês |

O seletor fica no canto superior direito. Todo texto — inclusive o que o
JavaScript escreve depois, como as migalhas, os avisos do leitor de tela e a
gaveta — sai de `src/i18n.ts`; o servidor serializa o dicionário da página num
`<script type="application/json">` e o cliente lê de lá. Números e datas usam
`Intl` com o locale da página (a moeda continua em BRL: o índice é brasileiro).
Os setores vêm da brapi em inglês e são traduzidos na exibição, não na gravação —
por isso `src/data/fallback.json` guarda a chave crua. A API aceita
`/api/snapshot.json?lang=en`.

Um limite conhecido: os **subsetores** só existem em português na brapi. Em vez
de traduzi-los no chute, o painel os exibe como vêm e marca o trecho com
`lang="pt-BR"`, para o leitor de tela pronunciar certo.

Para acrescentar um idioma: some uma entrada em `LOCALES`, um dicionário em
`src/i18n.ts` e uma rota que renderize `<Panel lang="..." />`.

## Como o painel se comporta

- **Zoom por clique**: raiz → setor → ativo. O caminho fica na trilha acima do
  mapa; `Esc` volta um nível; `/` vai para a busca.
- **Área** por peso no índice, valor de mercado ou volume financeiro.
- **Detalhe com histórico**: a gaveta traz preço, variação, abertura, mín/máx do
  dia, volume contra a média de 30 pregões, a posição do preço dentro da faixa de
  52 semanas (medidor), retornos acumulados de 1, 3, 6 e 12 meses e no ano, o
  gráfico de fechamento com 5 janelas e a série em tabela.
- **Agrupamento** por setor, subsetor ou nenhum. Setores com menos de 3% do índice
  entram num bloco **“Outros setores”** — com 19 setores crus o mapa virava um
  punhado de tiras onde nem o nome cabia. O bloco continua clicável e o zoom nele
  mostra todos os ativos dobrados.
- **Busca** por ticker, nome ou setor: o que não casa fica esmaecido, `Enter` dá
  zoom no primeiro resultado.
- **Atualização** automática a cada 60 s (pausada com a aba em segundo plano). O
  desenho anterior fica em opacidade reduzida durante a consulta, sem pisca-pisca.
- **Tabela equivalente** com todos os valores do mapa, renderizada no servidor —
  é o que aparece quando o JavaScript não roda. Ela lista os 76 ativos, inclusive
  os que o mapa dobrou em “Outros setores”.
- **Nenhuma caixa vazia.** O ticker aparece em todas, com o corpo da fonte
  calculado a partir da caixa, e virado 90° quando a caixa é alta e estreita.
  Para isso o layout aplica uma **área mínima por ativo** (`MIN_TILE_AREA`,
  1600 px²), resolvida por iteração: elevar os menores aumenta o total, que eleva
  o piso de novo. Em tela estreita o piso é limitado a 42% do total, senão o mapa
  achataria num quadriculado uniforme — aí quem encolhe é o rótulo.
  O efeito colateral é que as posições minúsculas ficam com área um pouco maior
  que o peso real; o peso exato está no rótulo, no tooltip, no leitor de tela e na
  tabela.
- **No celular** os rótulos dos controles encurtam, os nomes dos campos saem do
  fluxo visual (continuam para o leitor de tela) e o mapa fica com 70% da altura
  da tela.

## Descoberta e metadados

Cada página serve, no `<head>`:

| Tag | Para quê |
| --- | --- |
| `<title>` e `<meta name="description">` | o que aparece no resultado da busca |
| `<link rel="canonical">` | uma URL oficial por idioma, sem duplicata |
| `<link rel="alternate" hreflang>` | pt-BR, en e `x-default` apontando entre si |
| `<meta name="robots">` | `index, follow, max-image-preview:large, max-snippet:-1` |
| Open Graph + Twitter card | título, descrição, idioma, imagem 1200×630 e texto alternativo |
| `<script type="application/ld+json">` | dados estruturados (abaixo) |
| `<link rel="alternate" type="application/json">` | os mesmos dados da página em JSON |
| `manifest`, `apple-touch-icon`, `theme-color` | instalação e barra do navegador |

Mais `/robots.txt` e `/sitemap.xml`, ambos gerados na requisição. O sitemap lista
as duas versões de idioma e cada uma referencia a outra por `xhtml:link` — é
assim que o buscador entende que são traduções, e não conteúdo duplicado.

### Dados estruturados

Um grafo com quatro nós: `WebSite`, `WebPage`, `WebApplication` e **`Dataset`**.
O `Dataset` é o que dá identidade ao site: declara as variáveis publicadas
(ticker, peso, preço, variação, valor de mercado, volume), a cobertura temporal,
a data da última atualização, a distribuição em JSON (`/api/snapshot.json`) e as
fontes em `isBasedOn`. É o nó que faz a página ser indexável como fonte de dados
e não apenas como mais um gráfico.

Não há `author` nem `publisher` declarados: seria inventar uma identidade. Se o
site tiver dono, acrescente o nó `Organization` ou `Person` em `src/lib/seo.ts`.

### Antes de publicar

1. **Defina a origem canônica.** A ordem é: `SITE_URL` → cabeçalhos
   `X-Forwarded-Host`/`Host` da requisição → URL montada pelo adaptador. A
   terceira alternativa vira `http://localhost/` no servidor Node sozinho, que
   não serve para canônica — então atrás de proxy funciona sem configurar nada,
   mas fixar a variável é o caminho previsível:

   ```bash
   SITE_URL="https://seu-dominio.com.br" npm run build
   ```

2. **Regere as imagens** se mudar título ou paleta: `npm run images` grava
   `public/og.png`, `public/og-en.png` e os ícones do manifesto.
3. **Cadastre no Search Console** e envie `https://seu-dominio.com.br/sitemap.xml`.
   Se a verificação for por meta tag, acrescente a linha em
   `src/components/Panel.astro`, junto das demais.

`<meta name="keywords">` está lá porque alguns buscadores menores ainda o leem;
o Google ignora desde 2009.

## Decisões de cor

A escala é **divergente**: dois polos opostos e cinza neutro no meio, três degraus
por braço (7 classes).

O padrão é **azul (alta) × vermelho (baixa)**, não o verde/vermelho do mercado.
Medindo a separação dos dois polos em OKLab (ΔE ×100, simulação Machado-Oliveira-
Fernandes a severidade 1,0):

| Par | ΔE sob deuteranopia | ΔE visão normal |
| --- | --- | --- |
| azul × vermelho | **22,4** | 29,9 |
| verde × vermelho | **1,4** | 28,9 |

Verde e vermelho praticamente colapsam para quem tem deuteranopia — cerca de 1 em
cada 12 homens. A paleta clássica continua disponível em *Aparência → Cores*, e,
em qualquer uma delas, **cada área mostra a variação em número com sinal
explícito**, então a cor nunca é o único canal. Há ainda a opção de textura
(45° para alta, 135° para baixa), que também entra sozinha em `forced-colors` e na
impressão.

Cada braço da escala foi validado como rampa de um único tom: lightness monótona,
degraus visíveis e a ponta clara ainda legível sobre a superfície — em modo claro e
escuro. A tinta de cada faixa foi escolhida por contraste medido (mínimo 5,0:1).

## Estrutura

```
src/
  i18n.ts        dicionário pt-BR / en, setores e interpolação
  lib/           B3, brapi, Yahoo, cache, tipos e formatação por locale
    yahoo.ts     séries e cotação do índice
    detail.ts    compõe o detalhe do ativo e calcula retornos e médias
    seo.ts       canônica, alternativas por idioma e o grafo JSON-LD
  pages/
    index.astro             rota em português
    en/index.astro          rota em inglês
    api/snapshot.json.ts    retrato do índice para as atualizações (?lang=)
    api/ativo/[ticker].json.ts  cotação + histórico de um ativo
    robots.txt.ts           regras de rastreamento
    sitemap.xml.ts          as duas versões de idioma, com xhtml:link
  components/
    Panel.astro    o documento inteiro, parametrizado pelo idioma
    …              topo, controles, legenda, tabela e gaveta
  scripts/       mapa (treemap + zoom), gráfico da gaveta e a amarração
  data/          retrato local de contingência
scripts/refresh-fallback.mjs
```

## Limites

- A B3 publica a carteira teórica do dia; mudanças de composição entram no
  reequilíbrio quadrimestral.
- `Volume financeiro` é estimado (volume em ações × último preço).
- Preço e variação do dia no mapa vêm da brapi; a série histórica vem do Yahoo.
  As duas podem divergir alguns centavos no intradiário — cada bloco mostra a
  origem no rodapé.
- Painel informativo. Não é recomendação de investimento.
