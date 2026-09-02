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
  legal/                    ✅ Etapa 4 — Termos de Uso e Política de Privacidade
  api/
    capture · reminders     ✅ Etapa 5 — extração e persistência
    cron/dispatch           ✅ Etapa 5 — despachante de avisos (custo zero de IA)
    push/inscrever          ✅ Etapa 5 — registra o aparelho para receber avisos
    inbound/{email,whatsapp}✅ entrada de fora do app
    conta/excluir           ✅ Etapa 4 — exclusão permanente da conta
    assinatura/             ✅ Etapa 6 — checkout, webhook e cancelamento

src/components/
  ui/button.tsx             ✅ botões 3D (o relevo mora em globals.css)
  ui/logo.tsx               ✅ símbolo, wordmark e lockup em React
  ui/tema.tsx               ✅ Etapa 2 — alternador Sol/Lua e escolha do tema
  onboarding/               ✅ Etapa 1 — fluxo, cards de ROI, paywall
  permissoes/               ✅ Etapa 3 — explicação e câmera embutida
  legal/                    ✅ Etapa 4 — banner de cookies, rodapé, exclusão de conta

src/lib/
  pricing.ts                ✅ o plano num lugar só (o checkout lê daqui)
  onboarding/roi.ts         ✅ Etapa 1 — quanto custa esquecer
  nexo/                     ✅ Etapa 5 — prompt, extração, regras preditivas
  db/                       ✅ store em memória (dev) e Supabase (produção)
  permissoes.ts             ✅ Etapa 3 — justificativas e estado das permissões
  legal.ts · cookies.ts     ✅ Etapa 4 — controlador e consentimento
  notify.ts                 ✅ entrega do aviso: push primeiro, webhook depois
  push.ts                   ✅ Etapa 5 — Web Push (VAPID) e limpeza de assinatura morta
  tema.ts                   ✅ Etapa 2 — preferência de tema e script anti-flash
  assinatura/               ✅ Etapa 6 — cliente do Asaas e regra de acesso
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

## Assinatura

Gateway: **Asaas**. A razão é prática — no Brasil boa parte do público paga em
Pix e boleto, e recusar esses meios é recusar assinatura. O `billingType` fica
`UNDEFINED` para a pessoa escolher na hora.

**O estado mora no nosso banco, não no gateway.** O app precisa responder "esta
pessoa está em dia?" a cada requisição; perguntar isso ao Asaas toda vez seria
lento, caro e frágil. O gateway avisa por webhook, nós guardamos o resultado.

**Quem decide o acesso é `valid_until`, não `status`.** Quem cancela hoje pagou
até o fim do mês e continua usando até lá — é o que os Termos prometem. E se o
webhook parar de chegar, o acesso não fica aberto para sempre: a data vence
sozinha. `src/lib/assinatura/acesso.test.ts` cobre os dois lados.

**O webhook tem três cuidados**, e nenhum é opcional: token combinado (senão
qualquer um libera a própria conta com um POST), idempotência por id de evento
(gateways reenviam quando não recebem 200, e aplicar duas vezes empurraria o
vencimento dois meses), e 200 rápido mesmo para evento que não interessa —
erro nosso vira reenvio, e reenvio vira fila.

## Avisos

O aviso é o produto. Se ele não chega com o app fechado, nada do resto importa.

**Web Push (VAPID)** é o caminho: funciona igual no Android, no desktop e no
iOS a partir do 16.4 — lá, só com o app instalado na tela de início. O
`public/sw.js` existe para isso e só para isso: nenhum cache de página, porque
cache mal feito mostra lembrete velho, que é pior que não mostrar nada. A
notificação traz "Feito" e "Depois", que resolvem o lembrete sem abrir o app.

Uma pessoa tem mais de um aparelho, e todos devem tocar: o despachante manda
para todas as assinaturas do dono e considera entregue se qualquer uma aceitar.
O endpoint é a identidade da assinatura — reinscrever o mesmo aparelho atualiza
a linha em vez de duplicar o aviso — e 404/410 do serviço de push apaga a linha
na hora, senão o despachante bate em endereço morto para sempre.

**A cada minuto.** "Aviso 10 minutos antes" só é verdade se alguém olhar os
vencidos com frequência maior que a menor antecedência oferecida. Nenhum
agendador de graça chega lá — a Vercel Hobby aceita 1×/dia, o GitHub Actions não
desce de 5 minutos. Quem roda a cada minuto é o `pg_cron` do Postgres
(`supabase/migrations/0005_cron_por_minuto.sql`), fazendo um POST na rota de
despacho. Os outros dois ficam como rede de segurança, e a sobreposição é
inofensiva: o despachante lê só o que ainda não saiu e marca ao entregar.

**Custo zero de IA.** A rota de despacho não chama modelo nenhum — é leitura de
índice parcial (`sent_at is null and notify_at <= now()`), aritmética de data e
envio. `src/lib/nexo/despacho.test.ts` protege essa fronteira.

## LGPD e lojas

**Exclusão de conta.** `deleteOwner` faz parte do contrato do `Store`, então as
duas implementações precisam apagar tudo — e `src/lib/db/exclusao.test.ts`
falha se alguém acrescentar uma tabela e esquecer dela. Os arquivos saem
primeiro: se a linha da captura sumisse antes, o caminho do boleto no Storage
viraria lixo que ninguém mais sabe apagar. Depois vão os dados, o usuário do
Auth e o cookie do dispositivo.

**Consentimento de cookies.** Hoje só existem cookies necessários (sessão e id
do aparelho). O banner mesmo assim oferece a recusa, e a escolha fica em
`podeMedir()` — a porta que qualquer medição futura terá de atravessar. Sem
essa porta, o banner seria enfeite.

**Identificação da empresa** ficou fora dos documentos por enquanto: enquanto
não houver razão social e CNPJ reais, a página não diz nada em vez de dizer um
dado inventado. Quando existirem, entram em `src/lib/legal.ts`.

## Permissões

A ordem é sempre a mesma, e é a que Apple e Google exigem: **toque → nossa
explicação → a pessoa aceita → só então a API nativa**. Um "Permitir?" que
aparece do nada é negado, e no iOS uma permissão negada não volta a perguntar
sozinha — por isso existe também o modo "bloqueada", que ensina o caminho de
volta pelos ajustes em vez de deixar a pessoa presa.

| Toque | O que acontece |
| --- | --- |
| Câmera | Explicação → `getUserMedia` → câmera embutida com moldura e disparo |
| Galeria | Explicação → seletor de fotos do sistema |
| Arquivo | Direto: escolher um PDF não usa permissão de fotos |

Quem já aceitou não vê a explicação de novo (`nexo:permissao:*`), e quando o
`getUserMedia` não existe (navegador antigo, ou http) o `<input capture>` abre
o app de câmera do sistema.

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
