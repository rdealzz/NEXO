/**
 * Consentimento de cookies.
 *
 * O NEXO hoje só usa cookies estritamente necessários — a sessão do login e o
 * id anônimo do dispositivo. Não há rastreador nem publicidade. Mesmo assim o
 * aviso existe, porque a LGPD pede transparência e as lojas pedem o aviso — e
 * a escolha fica registrada aqui para que, no dia em que existir qualquer
 * medição, ela só rode com `podeMedir()` verdadeiro. Sem essa checagem, o
 * banner viraria enfeite.
 */
export type Consentimento = "tudo" | "essenciais";

export const CHAVE_COOKIES = "nexo:cookies";

export function lerConsentimento(): Consentimento | null {
  try {
    const salvo = localStorage.getItem(CHAVE_COOKIES);
    return salvo === "tudo" || salvo === "essenciais" ? salvo : null;
  } catch {
    return null;
  }
}

export function registrarConsentimento(escolha: Consentimento): void {
  try {
    localStorage.setItem(CHAVE_COOKIES, escolha);
  } catch {
    // Sem armazenamento, o aviso reaparece na próxima visita. É o correto:
    // sem registro do aceite, não se presume aceite.
  }
}

/** A porta que qualquer medição futura precisa atravessar. */
export function podeMedir(): boolean {
  return lerConsentimento() === "tudo";
}
