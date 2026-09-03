"use client";

import { usePathname } from "next/navigation";

/**
 * A tela não aparece: ela nasce.
 *
 * Trocar de página piscando o conteúdo novo é o que faz um site parecer site.
 * Aqui cada tela entra em ~260ms vindo de um pouco atrás e fora de foco, e
 * chega parada e nítida — a mesma sequência que o sistema operacional usa ao
 * abrir um app: escala, desfoque, profundidade, nitidez.
 *
 * A chave é o endereço: cada rota é uma cena, e mudar de rota reinicia a
 * animação. Sem ela, o React reaproveitaria o mesmo nó e a entrada aconteceria
 * uma vez só, no primeiro carregamento.
 */
export function Cena({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();

  return (
    <div key={caminho} className="cena flex flex-1 flex-col">
      {children}
    </div>
  );
}
