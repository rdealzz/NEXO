/**
 * Datas e contato dos documentos legais.
 *
 * Razão social, CNPJ e endereço ficaram de fora de propósito: enquanto a
 * empresa não estiver constituída, é melhor a página não dizer nada do que
 * dizer um dado inventado. O e-mail de contato é opcional pelo mesmo motivo —
 * sem ele, o texto aponta o caminho que já funciona hoje, dentro do app.
 */
export const EMAIL_CONTATO = process.env.NEXT_PUBLIC_EMAIL_CONTATO || null;

/** Data da última revisão dos documentos. */
export const ATUALIZADO_EM = "2 de setembro de 2026";
