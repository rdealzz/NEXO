"use client";

import { useEffect, useState, type ReactNode } from "react";

export type AbaPerfil = { id: string; nome: string; conteudo: ReactNode };

/**
 * As abas da conta.
 *
 * O perfil junta coisas de naturezas diferentes — quem você é, o que você paga,
 * como o NEXO te avisa, como você vai embora. Numa lista só, achar "cancelar" ou
 * "trocar o cartão" vira rolagem às cegas. Em abas, cada assunto tem um lugar
 * fixo, e o endereço guarda qual estava aberta (/perfil#plano), então dá para
 * mandar o link direto para a aba certa.
 *
 * Todas as abas são renderizadas no servidor e ficam no HTML: trocar de aba é
 * instantâneo e não custa requisição nenhuma.
 */
export function AbasPerfil({ abas, inicial }: { abas: AbaPerfil[]; inicial?: string }) {
  const [ativa, setAtiva] = useState(inicial ?? abas[0]?.id);

  // O # da URL manda: link compartilhado e botão "voltar" do navegador abrem a
  // mesma aba que a pessoa via.
  useEffect(() => {
    function doEndereco() {
      const alvo = window.location.hash.replace("#", "");
      if (abas.some((a) => a.id === alvo)) setAtiva(alvo);
    }
    doEndereco();
    window.addEventListener("hashchange", doEndereco);
    return () => window.removeEventListener("hashchange", doEndereco);
  }, [abas]);

  function trocar(id: string) {
    setAtiva(id);
    // replaceState em vez de href: não empilha uma entrada por clique de aba.
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <div className="mt-5">
      {/* Rola no celular em vez de quebrar em duas linhas. */}
      <div
        role="tablist"
        aria-label="Seções da conta"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            role="tab"
            id={`aba-${aba.id}`}
            aria-selected={ativa === aba.id}
            aria-controls={`painel-${aba.id}`}
            onClick={() => trocar(aba.id)}
            className={`btn btn--chip shrink-0 ${ativa === aba.id ? "btn--primary" : "btn--surface"}`}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      {abas.map((aba) => (
        <div
          key={aba.id}
          role="tabpanel"
          id={`painel-${aba.id}`}
          aria-labelledby={`aba-${aba.id}`}
          hidden={ativa !== aba.id}
        >
          {aba.conteudo}
        </div>
      ))}
    </div>
  );
}
