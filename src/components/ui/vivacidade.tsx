"use client";

import { useEffect } from "react";

/**
 * A luz que segue o cursor.
 *
 * Botões e cards têm um brilho que nasce onde o ponteiro está, e uma
 * inclinação mínima na direção dele. Quem escreve essas coordenadas é este
 * componente, montado uma vez no layout.
 *
 * Três decisões que sustentam os 60 quadros por segundo:
 *
 * 1. Um ouvinte só, no documento, em vez de um por peça. Numa lista de trinta
 *    lembretes seriam trinta ouvintes fazendo a mesma conta.
 * 2. O evento só guarda a posição; quem escreve no DOM é o quadro seguinte,
 *    dentro de requestAnimationFrame. O ponteiro dispara muito mais vezes do
 *    que a tela desenha, e escrever a cada disparo é trabalho jogado fora.
 * 3. Só variáveis CSS que alimentam `transform` e gradiente. Nada aqui muda
 *    largura, posição ou cor — nada que force o navegador a recalcular
 *    layout no meio do movimento.
 *
 * No celular nada disso roda: sem cursor não há luz para seguir, e o retorno
 * de um toque é o próprio toque.
 */

/** Quanto a peça se inclina, em graus, nos cantos. */
const INCLINACAO = 3;

export function Vivacidade() {
  useEffect(() => {
    const fino = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fino.matches) return;

    let x = 0;
    let y = 0;
    let alvo: HTMLElement | null = null;
    let agendado = false;

    function pintar() {
      agendado = false;
      const peca = alvo;
      if (!peca) return;

      const caixa = peca.getBoundingClientRect();
      if (!caixa.width || !caixa.height) return;

      // Posição do cursor dentro da peça, de 0 a 1.
      const px = (x - caixa.left) / caixa.width;
      const py = (y - caixa.top) / caixa.height;

      peca.style.setProperty("--luz-x", `${(px * 100).toFixed(1)}%`);
      peca.style.setProperty("--luz-y", `${(py * 100).toFixed(1)}%`);
      // A inclinação é invertida no eixo vertical: o cursor no topo empurra a
      // peça para trás por cima, que é como um objeto real reagiria.
      peca.style.setProperty("--inc-x", `${((px - 0.5) * 2 * INCLINACAO).toFixed(2)}deg`);
      peca.style.setProperty("--inc-y", `${((0.5 - py) * 2 * INCLINACAO).toFixed(2)}deg`);
    }

    function mover(evento: PointerEvent) {
      const sob = (evento.target as Element | null)?.closest?.<HTMLElement>(".btn, .peca") ?? null;

      // Saiu de uma peça: devolve o brilho ao centro para a próxima entrada não
      // começar com a luz onde o cursor esteve da última vez.
      if (alvo && alvo !== sob) {
        alvo.style.removeProperty("--luz-x");
        alvo.style.removeProperty("--luz-y");
        alvo.style.removeProperty("--inc-x");
        alvo.style.removeProperty("--inc-y");
      }

      alvo = sob;
      if (!alvo) return;

      x = evento.clientX;
      y = evento.clientY;
      if (!agendado) {
        agendado = true;
        requestAnimationFrame(pintar);
      }
    }

    document.addEventListener("pointermove", mover, { passive: true });
    return () => document.removeEventListener("pointermove", mover);
  }, []);

  return null;
}
