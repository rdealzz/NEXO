# Testes do NEXO

Dois níveis, e cada um responde uma pergunta diferente.

## `npm test` — as regras

Testes de unidade em `src/**/*.test.ts`, rodando no runner do Node. Cobrem o que
não pode errar em silêncio: acesso e cobrança (`acesso.test.ts`), o agendamento
dos avisos e o caminho da captura confirmada até o aviso saindo da fila
(`fluxo.test.ts`).

Não precisam de rede, de chave nem de navegador.

## `npm run teste:navegador` — o caminho da pessoa

Um Chromium de verdade abrindo o app, num viewport de celular, exercitando o
fluxo inteiro: jogar uma conta, conferir na revisão, confirmar, ver aparecer no
calendário, concluir, trocar o tema, trocar de bicho, olhar os planos.

Precisa do app rodando em `localhost:3000`:

```sh
npm run dev            # num terminal
npm run teste:navegador # no outro
```

A única coisa dublada é `/api/capture`, que depende da chave da Anthropic. A
resposta dublada tem a mesma forma que a rota devolve, então tudo o que vem
depois dela — revisão, confirmação, calendário, conclusão — é o código real.

Sai com código 1 se qualquer verificação falhar, e lista o que falhou.
