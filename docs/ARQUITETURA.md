# Estrutura do NEXO

Onde cada etapa do roadmap mora. O que já existe está marcado; o resto é o
lugar reservado, para o código não brigar com a estrutura depois.

```
public/
  marca/                    ✅ símbolo, wordmark e lockup da marca (SVG)
  icone.svg · icone-*.png   ✅ ícone do app (PWA, iOS, Android)
  icone-notificacao.*       ✅ o sino que aparece no push
  badge-notificacao.*       ✅ silhueta chapada (barra de status do Android)

src/app/
  page.tsx                  ✅ vitrine pública
  onboarding/               ✅ Etapa 1 — conversão: promessa → ROI → paywall
  entrar/ · auth/           ✅ contas
  inbox/                    ✅ o produto
  configuracoes/            ✅ canais de entrada · (Etapa 4: legal, LGPD, conta)
  legal/                    ⬜ Etapa 4 — Termos de Uso e Política de Privacidade
  api/
    capture · reminders     ✅ Etapa 5 — extração e persistência
    cron/dispatch           ✅ Etapa 5 — despachante de avisos (custo zero de IA)
    inbound/{email,whatsapp}✅ entrada de fora do app
    conta/excluir           ⬜ Etapa 4 — exclusão permanente da conta
    assinatura/             ⬜ Etapa 6 — checkout e webhook do gateway

src/components/
  ui/button.tsx             ✅ botões 3D (o relevo mora em globals.css)
  ui/logo.tsx               ✅ símbolo, wordmark e lockup em React
  ui/tema.tsx               ✅ Etapa 2 — alternador Sol/Lua e escolha do tema
  onboarding/               ✅ Etapa 1 — fluxo, cards de ROI, paywall
  permissoes/               ⬜ Etapa 3 — modais de câmera e galeria
  legal/                    ⬜ Etapa 4 — banner de cookies, exclusão de conta

src/lib/
  pricing.ts                ✅ o plano num lugar só (o checkout lê daqui)
  onboarding/roi.ts         ✅ Etapa 1 — quanto custa esquecer
  nexo/                     ✅ Etapa 5 — prompt, extração, regras preditivas
  db/                       ✅ store em memória (dev) e Supabase (produção)
  notify.ts                 ✅ entrega do aviso, já com a cara da marca
  tema.ts                   ✅ Etapa 2 — preferência de tema e script anti-flash
  assinatura/               ⬜ Etapa 6 — cliente do gateway e estado do plano
```

## A marca

O símbolo é um **sino de notificação com o N vazado no corpo**: a mesma peça
serve de logo no cabeçalho, de ícone do app e do ícone que aparece quando a
notificação chega no celular — que era o ponto: o aviso tem cara de NEXO.

| Arquivo | Onde usar |
| --- | --- |
| `public/marca/simbolo.svg` | símbolo isolado, fundo transparente |
| `public/marca/wordmark.svg` | só a palavra NEXO (herda a cor do contexto) |
| `public/marca/lockup.svg` | símbolo + palavra, horizontal |
| `src/components/ui/logo.tsx` | dentro do app — acompanha o tema |

Verde da marca `#146b4f`, luz `#7fecc0`, base creme `#fbf8f0`.

## Tema

O app **abre no claro, sempre** — inclusive para quem usa o sistema no escuro.
O escuro só entra quando a pessoa pede, e a escolha vale nos acessos seguintes.

Como isso se sustenta: o CSS só tem o escuro sob `:root[data-tema="escuro"]`
(não há `prefers-color-scheme` decidindo nada), e `SCRIPT_DO_TEMA` roda no topo
do `<body>`, antes da primeira pintura — sem ele, quem escolheu escuro veria um
flash branco a cada carregamento.

O alternador Sol/Lua fica no cabeçalho de todas as telas; em Configurações há a
escolha completa (Claro · Escuro · Sistema). Os dois leem o mesmo estado por
`useSyncExternalStore`, então nunca discordam — e mudar o tema numa aba
atualiza a outra.

## Botões

Todo botão do site usa `.btn3d` (`src/app/globals.css`) pelo componente
`Botao`/`BotaoLink` (`src/components/ui/button.tsx`). Um botão tem face
iluminada, espessura sólida e sombra projetada; ao clicar ele **afunda até a
base** — é o afundar que faz o clique parecer real. Variantes: `primary`,
`surface`, `soft`, `danger`, `ghost`. Tamanhos: `lg`, `md`, `sm`, `chip`,
`icon`.
