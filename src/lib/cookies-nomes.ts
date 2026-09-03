/**
 * Os nomes dos cookies de sessão do NEXO, sem nenhuma dependência.
 *
 * Ficam sozinhos aqui porque o middleware roda na edge e não carrega
 * `node:crypto` — importar src/lib/owner.ts de lá quebraria o build inteiro por
 * causa de duas strings.
 */

/** Id anônimo do aparelho, para usar o NEXO antes de criar conta. */
export const OWNER_COOKIE = "nexo_owner";

/** Primeira visita deste aparelho. É daqui que sai o relógio do teste grátis. */
export const INICIO_COOKIE = "nexo_desde";
