/**
 * O retorno tátil.
 *
 * No celular, o toque que não vibra parece que não aconteceu. Cada ação tem um
 * padrão próprio, curto, para a mão distinguir o que ocorreu sem olhar: mandar
 * é um toque seco, concluir é um duplo curto de recompensa, excluir é um pulso
 * mais longo — o peso de algo irreversível.
 *
 * A API só existe no Android; no iPhone `vibrate` não é implementada e a
 * chamada simplesmente não faz nada. Por isso nunca é o único retorno de uma
 * ação: a tela sempre responde também.
 */
export type Tato = "toque" | "sucesso" | "aviso" | "remocao" | "captura";

const PADROES: Record<Tato, number | number[]> = {
  toque: 8,
  captura: [12, 40, 12],
  sucesso: [10, 30, 18],
  aviso: [18, 60, 18],
  remocao: 32,
};

export function vibrar(tipo: Tato = "toque") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PADROES[tipo]);
  } catch {
    // Navegador que expõe a função mas recusa a chamada (aba sem interação,
    // política do sistema). Não é erro — é só um retorno a menos.
  }
}
