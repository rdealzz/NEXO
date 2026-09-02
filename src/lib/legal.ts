/**
 * Identificação do controlador e datas dos documentos legais.
 *
 * Fica em variáveis de ambiente porque muda quando a empresa muda — razão
 * social, CNPJ e e-mail de contato precisam ser os reais antes de publicar nas
 * lojas. Sem eles, as páginas simplesmente omitem a linha em vez de inventar.
 */
export const CONTROLADOR = {
  nome: process.env.NEXT_PUBLIC_EMPRESA_NOME ?? "NEXO",
  cnpj: process.env.NEXT_PUBLIC_EMPRESA_CNPJ ?? null,
  endereco: process.env.NEXT_PUBLIC_EMPRESA_ENDERECO ?? null,
  contato: process.env.NEXT_PUBLIC_EMAIL_CONTATO ?? "privacidade@nexo.app",
};

/** Data da última revisão dos documentos. */
export const ATUALIZADO_EM = "2 de setembro de 2026";

export function dataPorExtenso(): string {
  return ATUALIZADO_EM;
}
