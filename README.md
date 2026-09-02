# NEXO

**Joga aqui. Eu lembro.**

Todo app de tarefas parte de _"crie uma tarefa"_. O NEXO parte de _"joga aqui"_.

Você manda qualquer coisa que não quer esquecer — a foto de uma nota fiscal, um
boleto, o print da conversa, o PDF da garantia, o áudio do mecânico, um e-mail
encaminhado, ou só uma frase — e o NEXO responde a uma pergunta:

> **"Existe alguma coisa aqui que essa pessoa provavelmente não vai querer esquecer?"**

| Você manda | O NEXO responde |
| --- | --- |
| Foto da nota fiscal da TV | TV Samsung 55", R$ 2.899. Garantia até 02/09/2027 — aviso 30 dias antes? |
| Foto de um boleto | Conta de energia, R$ 187,42, vence 10/09. Aviso dia 7 e no dia. |
| Áudio: "troca o óleo daqui 6 meses" | Lembrete criado para 02/03/2027. |
| Print do WhatsApp da sua mãe | Marcar médico — quinta, 9h. |
| "Comprar tinta para casa" | Sem data: foi para a caixa de entrada. Quando? |

E a segunda metade da promessa: ele lembra o que você **nem pensou em pedir**.
Mandou a nota da geladeira? Guarda o fim da garantia e depois oferece o filtro a
cada 6 meses. Mandou o documento do carro? Já conhece revisão, seguro,
licenciamento e pneus.

**Pensou → mandou → esqueceu → NEXO lembra.**

---

## A economia do produto

A IA é chamada **uma vez por captura**, quando entra informação nova. Depois
disso é banco de dados, aritmética de data e notificação:

```
captura → 1 chamada de modelo → captura salva → lembretes → avisos materializados
                                                             ↓
                                             cron horário lê só o que venceu
                                             (índice parcial, custo ~zero)
```

Um usuário pagando R$ 9,90/mês pode abrir o app todo dia sem gerar custo de IA
proporcional ao uso. É isso que separa o NEXO de um chat que cobra por token.

Duas decisões sustentam isso:

- **O aviso é linha própria** (`notifications`), criada quando o lembrete nasce
  ou muda de data. O despachante lê `sent_at is null and notify_at <= now()` em
  índice parcial, não varre a base.
- **As sugestões proativas são tabela**, não modelo (`src/lib/nexo/rules.ts`).
  O modelo só complementa a cauda longa, e na mesma resposta que já foi paga.

---

## Rodando

```bash
npm install
cp .env.example .env.local   # e preencha ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Sem as variáveis do Supabase, o app usa um store em memória — ótimo para
experimentar, some no restart. Com elas, passa a usar Postgres automaticamente
(`src/lib/db/index.ts`).

```bash
npm test          # regras preditivas, agendamento e recorrência
npm run lint
npm run build
```

### Banco

Aplique as migrations de `supabase/migrations/` em ordem. Elas criam
`captures`, `reminders`, `notifications`, `purchases`, `profiles`, os índices do
despachante, as policies de RLS e o bucket privado `capturas`.

RLS libera **leitura apenas do próprio dono autenticado**; toda escrita passa
pelo backend com o service role, que valida o dono antes. Notas fiscais e
boletos ficam num bucket privado — nunca público.

### Avisos

`/api/cron/dispatch` varre os avisos vencidos e entrega. Sem
`NEXO_NOTIFY_WEBHOOK`, escreve no log; com webhook, faz um `POST` JSON por aviso
— é aí que entram WhatsApp, Telegram, push ou e-mail.

Quem chama essa rota depende do plano:

| Onde | Frequência | Observação |
| --- | --- | --- |
| `.github/workflows/avisos.yml` | a cada 10 min | É o despachante de verdade. Precisa dos secrets `NEXO_URL` e `CRON_SECRET` no repositório. Funciona em qualquer plano. |
| `vercel.json` | 1×/dia | Rede de segurança. **O plano Hobby da Vercel só aceita cron diário — um cron mais frequente aqui faz o deploy falhar.** No Pro, troque por `*/10 * * * *` e apague o workflow. |

A Vercel manda `Authorization: Bearer $CRON_SECRET` sozinha; o workflow manda o
mesmo header.

### Entrada de fora do app

| Canal | Rota | Como identifica o dono |
| --- | --- | --- |
| E-mail encaminhado | `POST /api/inbound/email` | Endereço `<slug>@INBOUND_EMAIL_DOMAIN` **e** remetente igual ao e-mail da conta |
| WhatsApp | `GET`/`POST /api/inbound/whatsapp` | Telefone verificado por código nas configurações |

O formato do webhook de e-mail é genérico de propósito: Resend, Postmark,
SendGrid ou Cloudflare Email Workers montam esse JSON com poucas linhas de cola.

Material pessoal não pode cair na conta errada, então não existe identificação
por palpite: ou o endereço e o remetente batem, ou o telefone foi verificado por
código enviado para o próprio número.

Fora do app não existe tela de revisão, então o NEXO cria o que entendeu com
clareza (confiança ≥ 0,6) e **responde dizendo exatamente o que fez** e o que
deixou de fazer por não ter certeza.

---

## Como está montado

```
src/lib/nexo/
  schema.ts      Contrato do que o modelo devolve (Zod → structured output)
  prompt.ts      As regras de interpretação, em português
  extract.ts     A única chamada de modelo do produto
  ingest.ts      O caminho que todo material percorre, venha de onde vier
  rules.ts       Motor preditivo — tabela e datas, zero IA
  transcribe.ts  Áudio → texto no servidor (só o WhatsApp precisa)
src/lib/db/
  schedule.ts    Quando cada aviso sai (fuso de São Paulo, recorrência)
  memory.ts      Store de dev
  supabase.ts    Store de produção
src/lib/inbound/ Resolução de dono e resposta dos canais externos
src/app/api/     capture · reminders · cron/dispatch · inbound/{email,whatsapp}
```

**O fluxo de uma captura:** o material vira blocos de conteúdo (`image`,
`document` ou texto) → `messages.parse` com `zodOutputFormat` garante que a
resposta valida contra `CaptureAnalysisSchema` → a tabela de regras acrescenta o
que a entidade costuma exigir → o usuário confirma o que quer.

**Nada vira lembrete sem confirmação dentro do app** — e quando a data foi
inferida em vez de lida, o card diz isso em vez de errar calado.

### Áudio

Dentro do app, a transcrição acontece no próprio dispositivo (Web Speech API,
Chrome/Edge): o áudio nunca sobe. No WhatsApp não existe navegador nesse
caminho, então é a única peça que fala com outro provedor —
`TRANSCRIPTION_API_KEY` aponta para qualquer endpoint compatível com a API de
transcrição da OpenAI (a própria, ou Groq com `whisper-large-v3`).

---

## Estado atual

**Funciona:** texto, imagem (foto/print/nota fiscal), PDF e áudio; caixa de
entrada para o que não tem data, com atalhos Hoje/Amanhã/Em 3 dias/Próxima
semana; antecedências em minutos (de "10 min antes" a "30 dias antes");
recorrência natural (`todo dia 5`, `toda segunda`, `a cada 6 meses`); adiar,
concluir e excluir; registro de compras e garantias; login por link mágico,
Google ou senha, com migração do que foi criado antes da conta; entrada por
e-mail e WhatsApp; PWA instalável.

**Ainda não:** push nativo (o despacho sai por webhook), cobrança, e as
perguntas sobre o histórico de compras ("quais produtos ainda estão na
garantia?") — o banco já guarda os dados para isso.
