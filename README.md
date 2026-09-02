# NEXO

**Você não precisa lembrar. Só precisa mandar pra cá.**

Todo app de tarefas parte de _"crie uma tarefa"_. O NEXO parte de _"joga aqui"_.

Você manda qualquer coisa que não quer esquecer — a foto de um boleto, o print
da conversa, o PDF da garantia, o áudio do mecânico, um e-mail encaminhado — e o
NEXO descobre sozinho o que precisa acontecer e quando.

| Você manda | O NEXO responde |
| --- | --- |
| Foto de um boleto | Vence 15/09. Aviso dia 12 e no dia. |
| E-mail: "sua garantia termina em 30 dias" | Aviso 7 dias antes de acabar. |
| Áudio: "troca o óleo daqui 6 meses" | Lembrete criado para 02/03/2027. |
| Print do WhatsApp da sua mãe | Marcar médico — quinta, 9h. |

E tem a segunda metade da promessa: ele lembra o que você **nem pensou em pedir**.
Mandou a nota da geladeira? Ele guarda o fim da garantia e depois oferece o
lembrete do filtro a cada 6 meses. Mandou o documento do carro? Ele já conhece
revisão, seguro, licenciamento e pneus.

---

## A economia do produto

A IA é chamada **uma vez por captura** — quando entra informação nova. Depois
disso é banco de dados, aritmética de data e notificação:

```
captura  →  1 chamada de IA  →  lembretes no Postgres  →  cron de hora em hora
                                                          (custo ~zero)
```

Um usuário pagando R$ 9,90/mês pode abrir o app todo dia sem gerar custo de IA
proporcional ao uso. É isso que separa o NEXO de um chat que cobra por token.

---

## Rodando

```bash
npm install
cp .env.example .env.local   # e preencha ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Sem `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, o app usa um store
em memória — ótimo para experimentar, some no restart. Com as duas variáveis,
ele passa a usar Postgres automaticamente (`src/lib/db/index.ts`).

```bash
npm test          # regras preditivas + matemática de agendamento
npm run lint
npm run build
```

### Banco

Aplique `supabase/migrations/0001_init.sql` no projeto Supabase. Ele cria
`captures`, `reminders`, os índices do despachante e a função
`nexo_mark_notified`. RLS fica ligado sem policy permissiva: o acesso é
exclusivamente pelo service role, do lado do servidor.

### Avisos

`/api/cron/dispatch` varre os avisos vencidos e entrega. Sem
`NEXO_NOTIFY_WEBHOOK`, escreve no log; com webhook, faz um `POST` JSON por
aviso — é aí que entram WhatsApp, Telegram, push ou e-mail. `vercel.json` já
agenda a varredura de hora em hora, e a Vercel autentica com `CRON_SECRET`.

---

## Como está montado

```
src/lib/nexo/
  schema.ts    Contrato do que a IA devolve (Zod → structured output)
  prompt.ts    As regras de interpretação, em português
  extract.ts   A única chamada de modelo do produto inteiro
  rules.ts     Motor preditivo — tabela e datas, zero IA
src/lib/db/
  schedule.ts  Quando cada aviso sai (fuso de São Paulo)
  memory.ts    Store de dev
  supabase.ts  Store de produção
src/app/api/
  capture/     Recebe qualquer coisa, devolve o que virou lembrete
  reminders/   CRUD, adiar, concluir, recorrência
  cron/        Despachante dos avisos
```

**O fluxo de uma captura:** o material vira blocos de conteúdo (`image`,
`document` ou texto) → `messages.parse` com `zodOutputFormat` garante que a
resposta valida contra `CaptureAnalysisSchema` → `suggestFollowUps` acrescenta o
que a entidade costuma exigir → o usuário confirma o que quer. **Nada é salvo
como lembrete sem confirmação** — quando a data foi inferida e não lida, o card
diz isso em vez de errar calado.

## Estado atual

Funciona hoje: texto, imagem (foto/print) e PDF; áudio transcrito no próprio
dispositivo pela Web Speech API (Chrome/Edge — o áudio nunca sobe); lembretes
com antecedências múltiplas, adiar, concluir e recorrência; despacho por webhook.

Ainda não: login (a v0 usa um id anônimo por dispositivo no cookie `nexo_owner`),
recebimento por e-mail/WhatsApp de fora do app, push nativo e cobrança.
